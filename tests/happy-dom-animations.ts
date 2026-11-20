if (typeof window !== "undefined" && "happyDOM" in window && typeof window.Animation === "function") {
  const cancel = window.Animation.prototype.cancel;
  window.Animation.prototype.cancel = function (this: Animation): void {
    // Web Animations marks the canceled finished promise handled. Happy DOM 21.0.4 only rejects it.
    void this.finished.catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    });
    cancel.call(this);
  };
}
