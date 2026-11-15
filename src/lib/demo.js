const demoStudySet = {
  id: "demo-networks-01",
  title: "Computer Networks: The Essentials",
  summary: "Explore how devices communicate, how network layers divide responsibilities, and how common protocols move data across the internet.",
  sourceText: "A demonstration study set about computer networking.",
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  mode: "both",
  difficulty: "medium",
  isDemo: true,
  knownCardIds: [],
  difficultCardIds: [],
  reviewedCardIds: [],
  flashcards: [
    { id: "demo-fc-1", front: "What is a computer network?", back: "A group of interconnected computing devices that exchange data and share resources using communication links and protocols.", difficulty: "easy" },
    { id: "demo-fc-2", front: "What is the primary role of the OSI model?", back: "It provides a seven-layer reference framework that standardizes network communication functions and helps different systems interoperate.", difficulty: "medium" },
    { id: "demo-fc-3", front: "How does TCP differ from UDP?", back: "TCP provides connection-oriented, reliable, ordered delivery. UDP is connectionless and has lower overhead but does not guarantee delivery or ordering.", difficulty: "medium" },
    { id: "demo-fc-4", front: "What does DNS do?", back: "The Domain Name System translates human-readable domain names into IP addresses used by networked devices.", difficulty: "easy" }
  ],
  quiz: [
    { id: "demo-q-1", question: "Which OSI layer is responsible for logical addressing and routing?", options: ["Data Link", "Network", "Transport", "Session"], correctOptionIndex: 1, explanation: "The Network layer (Layer 3) handles logical addressing and routing packets between networks.", difficulty: "medium" },
    { id: "demo-q-2", question: "Which protocol provides reliable, ordered byte-stream delivery?", options: ["UDP", "IP", "TCP", "DNS"], correctOptionIndex: 2, explanation: "TCP uses acknowledgements, sequencing, retransmission, and flow control to provide reliable ordered delivery.", difficulty: "easy" },
    { id: "demo-q-3", question: "What is the main purpose of DNS?", options: ["Encrypting files", "Assigning MAC addresses", "Translating domain names to IP addresses", "Detecting network collisions"], correctOptionIndex: 2, explanation: "DNS resolves domain names such as example.com to the IP addresses computers use to communicate.", difficulty: "easy" },
    { id: "demo-q-4", question: "A switch most commonly forwards Ethernet frames using which address?", options: ["IP address", "MAC address", "Port number", "Domain name"], correctOptionIndex: 1, explanation: "A Layer 2 switch learns MAC addresses and uses its MAC address table to forward Ethernet frames.", difficulty: "medium" }
  ]
};
export {
  demoStudySet
};
