export const links = {
  github: "https://github.com/ArjunDineshMenon",
  linkedin: "https://linkedin.com/in/arjundineshmenon",
  email: "mailto:arjundineshmenon1@gmail.com",
  resume: `${import.meta.env.BASE_URL}assets/documents/Arjun-Dinesh-Menon-Resume.docx`,
};
export const skills = [
  {
    n: "01",
    title: "Cloud & infrastructure",
    symbol: "cloud",
    active: ["AWS S3", "EC2", "IAM", "CloudFront"],
    learning: ["Lambda", "VPC", "Terraform"],
  },
  {
    n: "02",
    title: "DevOps & tooling",
    symbol: "terminal",
    active: ["Git", "GitHub", "Linux CLI"],
    learning: ["Docker", "Kubernetes", "GitHub Actions"],
  },
  {
    n: "03",
    title: "Languages",
    symbol: "code",
    active: ["Python", "HTML", "CSS"],
    learning: ["Bash", "YAML"],
  },
  {
    n: "04",
    title: "Japanese",
    symbol: "language",
    active: ["Hiragana", "Katakana"],
    learning: ["JLPT N5 material", "JLPT N4 material"],
  },
];
export const projects = [
  {
    n: "01",
    title: "A first step into the cloud.",
    name: "Personal Portfolio on AWS S3",
    status: "Live",
    type: "CLOUD DEPLOYMENT",
    description:
      "A static portfolio deployed with S3 website hosting, IAM bucket policy, public-access configuration, billing alarms, and MFA.",
    tech: ["AWS S3", "IAM", "HTML/CSS", "Git"],
    diagram: ["SOURCE", "S3 BUCKET", "THE WEB"],
  },
  {
    n: "02",
    title: "Closer to everywhere.",
    name: "Portfolio V2 with CloudFront and HTTPS",
    status: "In progress",
    type: "CLOUD INFRASTRUCTURE",
    description:
      "An in-progress upgrade adding a CDN, HTTPS, global distribution, and responsive multi-section design.",
    tech: ["CloudFront", "S3", "HTTPS", "DNS"],
    diagram: ["S3 ORIGIN", "CLOUDFRONT", "HTTPS"],
  },
  {
    n: "03",
    title: "Giving waste heat a purpose.",
    name: "Cupola Furnace Waste-Heat Recovery System",
    status: "Team project · Prototype concept",
    type: "SYSTEMS THINKING",
    description:
      "A team prototype concept for Coimbatore foundries, using a sensor-to-AWS-to-ML-to-dashboard architecture for energy monitoring.",
    tech: ["AWS", "Sensor architecture", "ML pipeline design"],
    diagram: ["SENSORS", "AWS + ML", "DASHBOARD"],
  },
];
export const roadmap = [
  {
    year: "2026",
    title: "Build the foundation",
    text: "AWS Cloud Practitioner, JLPT N5, Linux, Git, and initial projects.",
    status: "In progress",
  },
  {
    year: "2027",
    title: "Deepen the craft",
    text: "AWS Solutions Architect Associate, Security+, JLPT N4, Docker, and Kubernetes.",
    status: "Planned",
  },
  {
    year: "2028",
    title: "Specialise & apply",
    text: "CKA, JLPT N3, internship, MEXT preparation, and professor outreach.",
    status: "Planned",
  },
  {
    year: "2029",
    title: "Graduate",
    text: "B.Tech in AI & Data Science, KGiSL Institute of Technology.",
    status: "Target",
  },
  {
    year: "2030",
    title: "A new chapter in Japan",
    text: "Target MEXT-supported master’s study at JAIST or University of Aizu.",
    status: "Target",
  },
  {
    year: "2032",
    title: "Build a career in Japan",
    text: "Target Cloud/DevOps role in Japan; a long-term JLPT N1 goal.",
    status: "Target",
  },
];
export const certifications = [
  ["AWS Cloud Practitioner", "August 2026", "In progress"],
  ["AWS Solutions Architect Associate", "January 2027", "Planned"],
  ["CompTIA Security+", "May 2027", "Planned"],
  ["Certified Kubernetes Administrator", "2027–2028", "Planned"],
  ["JLPT N5", "December 2026", "Planned"],
  ["JLPT N3", "2027–2028", "Planned"],
];
