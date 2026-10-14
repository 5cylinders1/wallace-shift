/** Keep published versions immutable. Any wording change requires a new version.
 * The server saves this exact text and its SHA-256 digest with each acceptance. */
export const demoAgreement = {
  version: '2026-10-13.1',
  title: 'Demo Evaluation & Confidentiality Agreement',
  owner: 'Wallace Shift LLC',
  sections: [
    {
      heading: '1. Who is agreeing',
      paragraphs: [
        'This agreement is between Wallace Shift LLC and you, the person named in the acceptance form, together with the business you identify and are authorized to represent. It takes effect when you select both confirmations and choose “Accept agreement & open demo.”',
      ],
    },
    {
      heading: '2. Evaluation access',
      paragraphs: [
        'Wallace Shift LLC gives you limited, personal access to its approved demos to evaluate a potential project or services relationship. You may view and interact with them for that purpose, including the temporary copies your browser normally makes. Access does not grant a license to use the designs, code, content, or other original materials in your own or another person’s website, product, or service.',
        'Do not share your invitation, verification codes, or access session. Each additional viewer needs their own approved invitation and must accept this agreement. Access expires at the time stated in your invitation and may be withdrawn earlier.',
      ],
    },
    {
      heading: '3. Keep nonpublic information confidential',
      paragraphs: [
        'Use nonpublic information disclosed through the demos only for this evaluation. Protect it with reasonable care and do not disclose it to others without Wallace Shift LLC’s written permission. This covers information marked confidential or reasonably understood to be confidential from its nature and the circumstances, including nonpublic implementation details, designs, and business information.',
        'Confidential information does not include information that is public through no breach of this agreement, was already lawfully known to you without a duty of confidentiality, is independently developed without using the confidential information, or is lawfully received from someone entitled to disclose it. Materials previously made public do not become confidential solely because this demo now requires access.',
        'If disclosure is required by law, you may disclose what is legally required. Where legally permitted, give Wallace Shift LLC prompt notice and reasonable cooperation so it can seek protection. These obligations do not prohibit legally protected reporting to government authorities.',
      ],
    },
    {
      heading: '4. Respect the materials and their ownership',
      paragraphs: [
        'Except for ordinary evaluation in your browser or with prior written permission, do not copy, download, reproduce, distribute, publish, rehost, sell, sublicense, or adapt Wallace Shift LLC’s original demo materials for another use. Do not remove ownership notices or bypass access controls.',
        'Wallace Shift LLC and the applicable rights holders retain ownership of their materials. This agreement does not restrict rights granted under third-party or open-source licenses, your own pre-existing materials, independently created work, or your general skills and knowledge. No ownership rights transfer through demo access.',
      ],
    },
    {
      heading: '5. Duration and ending access',
      paragraphs: [
        'The confidentiality obligations last for two years after each disclosure. For information that qualifies as a trade secret, they continue for as long as it qualifies under applicable law. Expiration of demo access does not grant permission to reuse the materials or end these continuing obligations.',
        'At Wallace Shift LLC’s written request, stop using the demos and delete any confidential materials you separately retained, except copies required by law or retained in routine backups that are not used and remain protected. Ordinary browser caching is permitted for evaluation. Neither party is required to proceed with a project; any project work needs a separate agreement.',
      ],
    },
  ],
  acceptanceText: 'I have read and agree to the Demo Evaluation & Confidentiality Agreement with Wallace Shift LLC. By selecting “Accept agreement & open demo,” I intend to sign it electronically using the name I provide.',
  authorityText: 'I am authorized to accept this agreement for the business I have named, and the information I have provided is accurate.',
} as const

export const agreementText = [
  demoAgreement.title,
  `Version: ${demoAgreement.version}`,
  `Owner: ${demoAgreement.owner}`,
  ...demoAgreement.sections.flatMap(section => [section.heading, ...section.paragraphs]),
  demoAgreement.acceptanceText,
  demoAgreement.authorityText,
].join('\n\n')
