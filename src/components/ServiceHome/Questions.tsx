import './questions.css'

const questionGroups = [
  {
    id: 'costs',
    title: 'Costs & scope',
    questions: [
      {
        id: 'additional-costs',
        question: 'What will I pay beyond the package price?',
        paragraphs: ['For the website, we confirm any domain or paid service costs. For the lead page, hosting, software and email or SMS usage can be additional recurring costs. We identify these before you commit.'],
        initiallyOpen: true,
      },
      {
        id: 'payment',
        question: 'Can I choose by monthly versus a single payment?',
        paragraphs: ['Start with the work you need. The website package covers a business website and ongoing technical care. The lead page package covers a focused page and one workflow setup. A single setup payment does not remove hosting, software, usage charges or the need to maintain your tools.'],
      },
      {
        id: 'crm',
        question: 'Is a CRM included?',
        paragraphs: ['These packages include a private portal for your agreement and invoices with Wallace Shift. They do not include software to manage your own customers. We can review a compatible CRM you already use for a follow up setup; custom CRM work is scoped separately.'],
      },
      {
        id: 'seo',
        question: 'What does basic SEO cover?',
        paragraphs: ['Page titles, descriptions, headings and readable service information. Ongoing content, local SEO campaigns, link building and ranking guarantees are not part of the $250 package.'],
      },
    ],
  },
  {
    id: 'setup',
    title: 'Setup & next steps',
    questions: [
      {
        id: 'text-messaging',
        question: 'Can text messaging start straight away?',
        paragraphs: [
          'If your workflow includes automated texts to US customers from a local 10 digit number, A2P 10DLC business and campaign registration must be approved before sending. Review can take several business days or longer, especially if information needs correcting.',
          'Toll free numbers use a separate verification process. We confirm the provider requirements, customer consent process, current review timing and any registration or carrier fees before setup. Approval timing is outside our control.',
          'Email follow up does not require A2P registration; changing an agreed SMS workflow to email would need an agreed scope change.',
        ],
      },
      {
        id: 'existing-tools',
        question: 'Can you connect my existing tools?',
        paragraphs: ['We review compatibility and account access before agreeing the work. One agreed follow up setup is included in the $1,500 package. Additional connections, advertising reports and campaign management require their own scope.'],
      },
      {
        id: 'neither',
        question: 'What if I need neither package?',
        paragraphs: ['If your website and inquiry process already work, you may not need either. You can ask a question or discuss a separately scoped system without buying one of these packages.'],
      },
      {
        id: 'before-choosing',
        question: 'Can I ask questions before choosing?',
        paragraphs: ['Yes. You can compare the options, discuss an existing website or plan for later. You do not need to choose a package or be ready to purchase.'],
      },
    ],
  },
]

function AnswerDrawing() {
  return <svg className="purchase-questions__drawing" viewBox="0 0 188 112" width="188" height="112" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M20 17h70a9 9 0 0 1 9 9v30a9 9 0 0 1-9 9H49L30 78V65H20a9 9 0 0 1-9-9V26a9 9 0 0 1 9-9Z" />
    <path d="M29 34h51M29 46h32" />
    <path className="purchase-questions__drawing-reply" d="M87 48h80a9 9 0 0 1 9 9v32a9 9 0 0 1-9 9h-9v12l-19-12H87a9 9 0 0 1-9-9V57a9 9 0 0 1 9-9Z" />
    <path className="purchase-questions__drawing-lines" d="M97 66h60M97 79h43" />
  </svg>
}

export default function Questions() {
  return <section className="purchase-questions r-light" id="purchase-faq" aria-labelledby="purchase-faq-heading">
    <div className="r-wrap">
      <header className="purchase-questions__intro">
        <h2 id="purchase-faq-heading">A few things<br /><em>worth knowing.</em></h2>
        <div className="purchase-questions__preface">
          <AnswerDrawing />
          <p>What is included, what can cost extra, and what happens before setup.</p>
        </div>
      </header>
      <div className="purchase-questions__groups">
        {questionGroups.map(group => <div className="purchase-questions__group" key={group.id}>
          <h3 id={`faq-group-${group.id}`}>{group.title}</h3>
          <div className="purchase-questions__list" role="group" aria-labelledby={`faq-group-${group.id}`}>
            {group.questions.map(item => <details className="purchase-questions__item" id={`faq-${item.id}`} key={item.id} open={item.initiallyOpen || undefined}>
              <summary>
                <span>{item.question}</span>
                <span className="purchase-questions__toggle" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false"><path d="M3 8h10" /><path className="purchase-questions__toggle-stem" d="M8 3v10" /></svg>
                </span>
              </summary>
              <div className="purchase-questions__answer">{item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
            </details>)}
          </div>
        </div>)}
      </div>
    </div>
  </section>
}
