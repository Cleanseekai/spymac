/**
 * Simple wrapper for WebAuthn (Passkeys/FaceID)
 * Note: Requires HTTPS and a modern browser.
 */
export const biometricService = {
  isSupported: (): boolean => {
    return !!(window.PublicKeyCredential && window.crypto);
  },

  register: async (username: string) => {
    if (!biometricService.isSupported()) throw new Error("Biometrics not supported on this device");

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: { name: "CleanSeek Secure", id: window.location.hostname },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({ publicKey: options });
    return credential;
  },

  authenticate: async () => {
    if (!biometricService.isSupported()) throw new Error("Biometrics not supported");

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname,
      userVerification: "required",
    };

    const assertion = await navigator.credentials.get({ publicKey: options });
    return assertion;
  },

  // For simulation in environments where hardware isn't available
  simulateVerification: async () => {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
};
