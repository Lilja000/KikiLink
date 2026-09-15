export interface DeviceCredential {
  id: string;
  expiresAt: number;
}
export interface DeviceKey {
  privateKey: CryptoKey;
  publicKey: { kty: "EC"; crv: "P-256"; x: string; y: string };
  device?: DeviceCredential;
}
export interface CloudDeviceStore {
  load(): Promise<DeviceKey | "paused" | undefined>;
  prepare?(allowPaused: boolean): Promise<DeviceKey | "paused">;
  save(key: DeviceKey): Promise<void>;
  pause(): Promise<void>;
}

export async function createDeviceKey(): Promise<DeviceKey> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    privateKey: pair.privateKey,
    publicKey: { kty: "EC", crv: "P-256", x: jwk.x!, y: jwk.y! },
  };
}

export async function signDeviceChallenge(
  key: DeviceKey,
  challengeId: string,
  nonce: string,
  deviceId: string,
  memberNumber: number,
  pageOrigin: string,
): Promise<string> {
  const message = `KIKILINK_DEVICE_V1\n${challengeId}\n${nonce}\n${deviceId}\n${memberNumber}\n${pageOrigin}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key.privateKey,
    new TextEncoder().encode(message),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/** Browser-local CryptoKey storage; deliberately separate from synchronized BC settings. */
export class IndexedDbCloudDeviceStore implements CloudDeviceStore {
  readonly #key: string;
  constructor(origin: string, memberNumber: number) {
    this.#key = `${origin}\n${memberNumber}`;
  }
  #valid(value: unknown): value is DeviceKey {
    const key = value as DeviceKey | undefined;
    return (
      !!key &&
      key.privateKey?.type === "private" &&
      key.privateKey.extractable === false &&
      key.privateKey.algorithm.name === "ECDSA" &&
      key.privateKey.usages.includes("sign") &&
      key.publicKey?.kty === "EC" &&
      key.publicKey.crv === "P-256" &&
      /^[A-Za-z0-9_-]{43}$/.test(key.publicKey.x) &&
      /^[A-Za-z0-9_-]{43}$/.test(key.publicKey.y) &&
      (!key.device ||
        (/^[a-f0-9-]{36}$/i.test(key.device.id) &&
          Number.isSafeInteger(key.device.expiresAt)))
    );
  }
  async #open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("KikiLink.CloudDevices.v1", 1);
      let settled = false;
      const fail = () => {
        settled = true;
        clearTimeout(timer);
        reject(new Error("device_storage_unavailable"));
      };
      const timer = setTimeout(fail, 2000);
      request.onupgradeneeded = () => {
        if (settled) request.transaction?.abort();
        else request.result.createObjectStore("devices");
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = request.onblocked = fail;
    });
  }
  async #transaction<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore, result: (value: T) => void) => void,
  ): Promise<T> {
    const db = await this.#open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction("devices", mode);
        let value!: T;
        const fail = () => {
          clearTimeout(timer);
          reject(new Error("device_storage_unavailable"));
        };
        const timer = setTimeout(() => {
          try {
            tx.abort();
          } catch {
            /* It may have just completed. */
          }
          fail();
        }, 2000);
        tx.oncomplete = () => {
          clearTimeout(timer);
          resolve(value);
        };
        tx.onerror = tx.onabort = fail;
        try {
          work(tx.objectStore("devices"), (result) => {
            value = result;
          });
        } catch {
          try {
            tx.abort();
          } catch {
            /* Already aborted. */
          }
          fail();
        }
      });
    } finally {
      db.close();
    }
  }
  async load(): Promise<DeviceKey | "paused" | undefined> {
    const value = await this.#transaction<unknown>(
      "readonly",
      (store, result) => {
        const request = store.get(this.#key);
        request.onsuccess = () => result(request.result);
      },
    );
    if (value === "paused") return value;
    return this.#valid(value) ? value : undefined;
  }
  async prepare(allowPaused: boolean): Promise<DeviceKey | "paused"> {
    const saved = await this.load();
    if (saved && (saved !== "paused" || !allowPaused)) return saved;
    const candidate = await createDeviceKey();
    return this.#transaction<DeviceKey | "paused">(
      "readwrite",
      (store, result) => {
        const request = store.get(this.#key);
        request.onsuccess = () => {
          const current: unknown = request.result;
          if (current === "paused" && !allowPaused) result("paused");
          else if (this.#valid(current)) result(current);
          else {
            store.put(candidate, this.#key);
            result(candidate);
          }
        };
      },
    );
  }
  async #write(value: DeviceKey | "paused"): Promise<void> {
    await this.#transaction<void>("readwrite", (store) => {
      if (value === "paused") store.put(value, this.#key);
      else {
        const request = store.get(this.#key);
        request.onsuccess = () => {
          // Another tab's explicit sign-out wins over an in-flight login save.
          if (request.result !== "paused") store.put(value, this.#key);
        };
      }
    });
  }
  save(key: DeviceKey): Promise<void> {
    return this.#write(key);
  }
  pause(): Promise<void> {
    return this.#write("paused");
  }
}
