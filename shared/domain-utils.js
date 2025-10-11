// Shared utilities for domain handling and common functions

class DomainUtils {
  static extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return url;
    }
  }

  static isValidDomain(domain) {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  static normalyzeDomain(domain) {
    // Remove www. prefix and convert to lowercase
    return domain.toLowerCase().replace(/^www\./, '');
  }
}

// Export for use in different parts of the extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DomainUtils;
}