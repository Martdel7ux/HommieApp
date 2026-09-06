/**
 * Tiny cross-screen flag: the full-screen Terms/Privacy review ("Accept &
 * Continue") ticks this, and the sign-up form reads it back on focus so the
 * "I agree" checkbox reflects the acceptance without a params round-trip.
 */
let accepted = false;

export const termsAccept = {
  get: () => accepted,
  set: (v: boolean) => {
    accepted = v;
  },
};
