/** Install ONLY in a process that owns an authenticated native BC socket.
 * This file has no login code, credentials, or effect on the production Runner.
 * Never expose receive/verify as a public HTTP endpoint or trust relayed packet identity.
 */
export function attachCloudVerifier(
  socket,
  {
    expectedVerifierMember,
    allowedMembers,
    mode = "staging",
    canReceive,
    getAuthenticatedMemberNumber,
    endpoint,
    secret,
    fetchImpl = fetch,
    diagnostic = () => {},
  },
) {
  if (
    !Number.isSafeInteger(expectedVerifierMember) ||
    expectedVerifierMember < 1 ||
    typeof getAuthenticatedMemberNumber !== "function"
  )
    throw new Error("Pin the authenticated verifier identity");
  if (
    !(allowedMembers instanceof Set) ||
    !allowedMembers.size ||
    allowedMembers.size > 100 ||
    [...allowedMembers].some(
      (v) => !Number.isSafeInteger(v) || v < 1 || v === expectedVerifierMember,
    )
  )
    throw new Error("Explicit staging tester identities are required");
  const testers = new Set(allowedMembers);
  if (!["staging", "production"].includes(mode) || (mode === "production" && typeof canReceive !== "function"))
    throw new Error("Public verification requires bounded pending recipients");
  const url = new URL(endpoint);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/verify" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("Verifier ingress must be the private loopback listener");
  if (typeof secret !== "string" || secret.length < 43)
    throw new Error("A separate verifier credential is required");
  let pending = 0,
    closed = false;
  const jobs = new Set();
  const proofs = new Map();
  const reported = new Set();
  function report(code) {
    if (reported.has(code)) return;
    reported.add(code);
    try {
      diagnostic(code);
    } catch {
      /* Diagnostics have no authority. */
    }
  }
  function receive(sender, wire) {
    let authenticatedMember;
    let permitted;
    try {
      authenticatedMember = getAuthenticatedMemberNumber();
      permitted = mode === "production" ? canReceive(sender) === true : testers.has(sender);
    } catch {
      return;
    }
    if (
      closed ||
      !socket.connected ||
      authenticatedMember !== expectedVerifierMember ||
      pending >= 4
    )
      return;
    if (
      !Number.isSafeInteger(sender) ||
      sender < 1 ||
      sender === expectedVerifierMember ||
      !permitted ||
      typeof wire !== "string" ||
      wire.length > 300 ||
      !wire.startsWith("KIKILINK/1 ")
    )
      return report("proof_sender_or_payload_rejected");
    let data;
    try {
      data = JSON.parse(wire.slice(11));
    } catch {
      return report("proof_json_rejected");
    }
    if (
      !data ||
      Array.isArray(data) ||
      Object.keys(data).sort().join(",") !== "challengeId,proof,t,v" ||
      data.t !== "cloud-verify" ||
      data.v !== 1 ||
      !/^[0-9a-f-]{36}$/i.test(data.challengeId) ||
      !/^[A-Za-z0-9_-]{43}$/.test(data.proof)
    )
      return report("proof_schema_rejected");
    report("native_proof_received");
    const key = `${sender}:${data.challengeId}:${data.proof}`, now = Date.now();
    for (const [old, expiresAt] of proofs) if (expiresAt <= now) proofs.delete(old);
    if (proofs.has(key) || proofs.size >= 256) return;
    proofs.set(key, now + 3000);
    pending++;
    const controller = new AbortController();
    jobs.add(controller);
    const timer = setTimeout(() => controller.abort(), 3000);
    timer.unref?.();
    // The sender comes ONLY from the event envelope provided by BC's server.
    Promise.resolve()
      .then(() =>
        fetchImpl(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            challengeId: data.challengeId,
            proof: data.proof,
            sender,
          }),
          signal: controller.signal,
          redirect: "error",
        }),
      )
      .then((response) => {
        proofs.set(key, Date.now() + (response.ok ? 180000 : 1000));
        report(response.ok ? "proof_accepted" : "proof_api_rejected");
        return response.body?.cancel();
      })
      .catch(() => { proofs.delete(key); report("proof_api_unavailable"); })
      .finally(() => {
        clearTimeout(timer);
        jobs.delete(controller);
        pending--;
      });
  }
  const beep = (data) => {
    report("native_beep_received");
    if (data?.BeepType === "KikiLink") receive(data.MemberNumber, data.Message);
    else report("native_beep_type_rejected");
  };
  const chat = (data) => {
    if (data?.Type === "Hidden") receive(data.Sender, data.Content);
  };
  socket.on("AccountBeep", beep);
  // ChatRoomChat is the outgoing command. BC sends ChatRoomMessage to clients.
  socket.on("ChatRoomMessage", chat);
  return () => {
    closed = true;
    proofs.clear();
    socket.off("AccountBeep", beep);
    socket.off("ChatRoomMessage", chat);
    for (const c of jobs) c.abort();
  };
}
