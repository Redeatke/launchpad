// Cover letter and email templates
export const coverLetterTemplates = {
  professional: (data) => `Dear ${data.hiringManager || 'Hiring Manager'},

I am writing to express my strong interest in the ${data.role || '[Role Title]'} position at ${data.company || '[Company Name]'}${data.location ? `, located in ${data.location}` : ''}. As a recent graduate with a passion for software engineering and a solid foundation in computer science, I am excited about the opportunity to contribute to your team.

${data.resumeHighlights ? `Throughout my academic career and projects, I have developed expertise in ${data.resumeHighlights}. ` : ''}I am particularly drawn to ${data.company || '[Company Name]'} because of its commitment to innovation and its impact in the technology sector.

My technical skills, combined with my ability to collaborate effectively in team environments, position me well for this role. I am eager to bring my problem-solving abilities and enthusiasm for learning to ${data.company || '[Company Name]'}.

I would welcome the opportunity to discuss how my background aligns with your team's needs. Thank you for considering my application.

Sincerely,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}
${data.userPhone || ''}
${data.userLinkedin || ''}`,

  startup: (data) => `Hey ${data.hiringManager || 'there'},

I came across the ${data.role || '[Role Title]'} role at ${data.company || '[Company Name]'} and got genuinely excited — the kind of work you're doing really resonates with what I want to build my career around.

I'm a recent CS grad who loves shipping products and solving real problems. ${data.resumeHighlights ? `I've worked with ${data.resumeHighlights} and thrive in fast-paced environments. ` : ''}I'm the kind of engineer who writes clean code but also isn't afraid to hack together a quick prototype to test an idea.

I'd love to chat about how I can contribute to ${data.company || '[Company Name]'}'s mission. Let me know if you're open to a quick conversation!

Best,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}`,

  technical: (data) => `Dear ${data.hiringManager || 'Hiring Manager'},

I am applying for the ${data.role || '[Role Title]'} position at ${data.company || '[Company Name]'}. With a degree in Computer Science and hands-on experience in software development, I am confident in my ability to make meaningful contributions to your engineering team.

${data.resumeHighlights ? `My technical expertise includes ${data.resumeHighlights}. ` : ''}I have a strong foundation in data structures, algorithms, and system design, which I have applied across multiple projects and coursework.

I am passionate about writing maintainable, well-tested code and staying current with industry best practices. I would be thrilled to bring this discipline and enthusiasm to ${data.company || '[Company Name]'}.

Thank you for your time and consideration. I look forward to the opportunity to discuss my qualifications further.

Best regards,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}
${data.userLinkedin || ''}`
};

export const emailTemplates = {
  referral: (data) => ({
    subject: `Referral Request — ${data.role || '[Role]'} at ${data.company || '[Company]'}`,
    body: `Hi ${data.contactName || '[Name]'},

I hope this message finds you well! I noticed that you work at ${data.company || '[Company]'} and I wanted to reach out.

I recently applied for the ${data.role || '[Role Title]'} position and I'm very excited about the opportunity. ${data.resumeHighlights ? `I have experience in ${data.resumeHighlights} and believe I'd be a great fit. ` : ''}

Would you be open to referring me for this role? I'd be happy to share my resume and chat briefly about my background. I completely understand if you're not comfortable doing so.

Thank you for your time!

Best,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}
${data.userLinkedin || ''}`
  }),

  recruiter: (data) => ({
    subject: `Interest in ${data.role || '[Role]'} — ${data.company || '[Company]'}`,
    body: `Hi ${data.contactName || '[Name]'},

I am reaching out to express my interest in the ${data.role || '[Role Title]'} position at ${data.company || '[Company]'}. As a new graduate in Computer Science, I am eager to begin my career in software engineering.

${data.resumeHighlights ? `My background includes ${data.resumeHighlights}. ` : ''}I believe my skills and enthusiasm align well with what your team is looking for.

Would you have a few minutes to discuss this opportunity? I have also submitted my application through your careers page.

Thank you for your consideration.

Best regards,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}`
  }),

  hiring_manager: (data) => ({
    subject: `${data.role || '[Role]'} Application — ${data.userName || '[Your Name]'}`,
    body: `Dear ${data.contactName || '[Name]'},

I am writing to introduce myself regarding the ${data.role || '[Role Title]'} opportunity on your team at ${data.company || '[Company]'}.

${data.resumeHighlights ? `I bring experience in ${data.resumeHighlights} and am eager to contribute to your team's goals. ` : ''}I am passionate about building high-quality software and would love the chance to discuss how I can add value.

I have submitted my formal application as well. Would you be available for a brief conversation?

Best regards,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}
${data.userLinkedin || ''}`
  }),

  followup: (data) => ({
    subject: `Following Up — ${data.role || '[Role]'} Application`,
    body: `Hi ${data.contactName || '[Name]'},

I hope you're doing well. I wanted to follow up on my application for the ${data.role || '[Role Title]'} position at ${data.company || '[Company]'}, which I submitted recently.

I remain very enthusiastic about this opportunity and would love to learn more about the team and role. Please let me know if there is any additional information I can provide.

Thank you for your time!

Best,
${data.userName || '[Your Name]'}
${data.userEmail || '[Your Email]'}`
  })
};
