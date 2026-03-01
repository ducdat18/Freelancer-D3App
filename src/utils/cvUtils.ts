/**
 * Extract CV hash from proposal text
 * Proposal format: "proposal text\n\n[CV/Resume: ipfs://QmHash]"
 */
export function extractCVHash(proposal: string): string | null {
  if (!proposal) return null;

  // Match pattern: [CV/Resume: ipfs://QmHash]
  const cvPattern = /\[CV\/Resume:\s*ipfs:\/\/([a-zA-Z0-9]+)\]/;
  const match = proposal.match(cvPattern);

  return match ? match[1] : null;
}

/**
 * Remove CV hash link from proposal text to get clean proposal
 */
export function getCleanProposal(proposal: string): string {
  if (!proposal) return '';

  // Remove the CV/Resume link part
  return proposal.replace(/\n\n\[CV\/Resume:\s*ipfs:\/\/[a-zA-Z0-9]+\]/, '').trim();
}

/**
 * Check if proposal contains CV
 */
export function hasCV(proposal: string): boolean {
  return extractCVHash(proposal) !== null;
}
