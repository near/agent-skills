export const KEY_BID_MARKER_PREFIX = 'near_market_bid_submitted:';
export const KEY_SUBMIT_STATE_PREFIX = 'near_market_submit_state:';
export const KEY_SETTLEMENT_CURSOR = 'near_market_settlement_cursor';
export const KEY_WITHDRAWN_PREFIX = 'near_market_bid_withdrawn:';

export function bidMarkerKey(jobId: string): string {
  return `${KEY_BID_MARKER_PREFIX}${jobId}`;
}

export function submitStateKey(jobId: string, bidId: string): string {
  return `${KEY_SUBMIT_STATE_PREFIX}${jobId}:${bidId}`;
}

export function withdrawnBidKey(bidId: string): string {
  return `${KEY_WITHDRAWN_PREFIX}${bidId}`;
}
