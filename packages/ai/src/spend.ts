/**
 * Spend caps. Checked before a request leaves the process, not after a bill
 * arrives. In-memory here; swap the store for Redis or Postgres when there is
 * a second api instance.
 */
export class SpendCapExceeded extends Error {
  constructor(
    readonly scope: 'user' | 'global',
    readonly spentUsd: number,
    readonly capUsd: number,
  ) {
    super(`${scope} spend cap reached: $${spentUsd.toFixed(2)} of $${capUsd.toFixed(2)}`);
    this.name = 'SpendCapExceeded';
  }
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export class SpendLedger {
  private byUser = new Map<string, number>();
  private userCaps = new Map<string, number>();
  private global = 0;

  constructor(
    private userCapUsd = num(process.env.FOYER_SPEND_CAP_USER_USD, 5),
    private globalCapUsd = num(process.env.FOYER_SPEND_CAP_GLOBAL_USD, 250),
  ) {}

  /** Override the per-user cap for one id, e.g. the eval runner's budget. */
  setUserCap(userId: string, capUsd: number): void {
    this.userCaps.set(userId, capUsd);
  }

  assertHeadroom(userId: string, estimateUsd: number): void {
    const cap = this.userCaps.get(userId) ?? this.userCapUsd;
    const user = (this.byUser.get(userId) ?? 0) + estimateUsd;
    if (user > cap) throw new SpendCapExceeded('user', user, cap);
    const global = this.global + estimateUsd;
    if (global > this.globalCapUsd) throw new SpendCapExceeded('global', global, this.globalCapUsd);
  }

  record(userId: string, actualUsd: number): void {
    this.byUser.set(userId, (this.byUser.get(userId) ?? 0) + actualUsd);
    this.global += actualUsd;
  }

  spent(userId: string): { user: number; global: number } {
    return { user: this.byUser.get(userId) ?? 0, global: this.global };
  }
}

export const ledger = new SpendLedger();
