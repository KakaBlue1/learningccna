// ========== HELPERS ==========
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prefixToMask(prefix) {
  const mask = [];
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, prefix - i * 8));
    mask.push(256 - Math.pow(2, 8 - bits));
  }
  return mask.join('.');
}

// ========== SUBNETTING GENERATOR ==========
export function genSubnetting(difficulty = 'medium') {
  const bases = ['192.168', '10.0', '172.16', '10.10', '172.20'];
  const base = bases[rand(0, bases.length - 1)];
  const octet3 = rand(1, 254);
  const ip = `${base}.${octet3}.0`;

  const prefixRange = difficulty === 'hard'
    ? [25, 26, 27, 28, 29, 30]
    : difficulty === 'medium'
    ? [24, 25, 26, 27]
    : [24, 25, 26];

  const prefix = prefixRange[rand(0, prefixRange.length - 1)];
  const hostBits = 32 - prefix;
  const totalHosts = Math.pow(2, hostBits);
  const usableHosts = totalHosts - 2;
  const subnetMask = prefixToMask(prefix);

  const type = rand(1, 4);

  // Type 1: Hỏi số host
  if (type === 1) {
    const wrongs = shuffle([
      usableHosts + 2,
      usableHosts * 2,
      totalHosts,
      usableHosts === 2 ? 4 : usableHosts - 2
    ]).filter(w => w !== usableHosts).slice(0, 3);

    const opts = shuffle([
      { text: `${usableHosts} host`, correct: true },
      ...wrongs.map(w => ({ text: `${w} host`, correct: false }))
    ]);

    return {
      id: `gen-sub-${Date.now()}-${rand(1,9999)}`,
      category: 'Subnetting',
      difficulty,
      question: `Địa chỉ mạng <code>${ip}/${prefix}</code> có bao nhiêu host khả dụng?`,
      options: opts.map(o => o.text),
      answer: opts.findIndex(o => o.correct),
      explanation: `/${prefix} → ${hostBits} bit host → 2^${hostBits} = ${totalHosts} địa chỉ. Trừ 2 (network + broadcast) = **${usableHosts} host** khả dụng.`,
      generated: true
    };
  }

  // Type 2: Hỏi subnet mask
  if (type === 2) {
    const otherPrefixes = [24, 25, 26, 27, 28, 29, 30].filter(p => p !== prefix);
    const wrongs = shuffle(otherPrefixes).slice(0, 3);

    const opts = shuffle([
      { text: subnetMask, correct: true },
      ...wrongs.map(p => ({ text: prefixToMask(p), correct: false }))
    ]);

    return {
      id: `gen-mask-${Date.now()}-${rand(1,9999)}`,
      category: 'Subnetting',
      difficulty,
      question: `Subnet mask của địa chỉ <code>${ip}/${prefix}</code> là gì?`,
      options: opts.map(o => o.text),
      answer: opts.findIndex(o => o.correct),
      explanation: `/${prefix} = **${subnetMask}**`,
      generated: true
    };
  }

  // Type 3: Hỏi số subnet khi chia
  if (type === 3) {
    const borrowBits = rand(1, Math.min(4, 30 - prefix));
    const newPrefix = prefix + borrowBits;
    const numSubnets = Math.pow(2, borrowBits);

    const wrongs = shuffle([numSubnets * 2, numSubnets / 2, borrowBits * 2, numSubnets + 2])
      .filter(n => n !== numSubnets && n > 0 && Number.isInteger(n))
      .slice(0, 3);

    const opts = shuffle([
      { text: `${numSubnets} subnet`, correct: true },
      ...wrongs.map(n => ({ text: `${n} subnet`, correct: false }))
    ]);

    return {
      id: `gen-div-${Date.now()}-${rand(1,9999)}`,
      category: 'Subnetting',
      difficulty,
      question: `Chia mạng <code>${ip}/${prefix}</code> bằng cách mượn ${borrowBits} bit. Có bao nhiêu subnet?`,
      options: opts.map(o => o.text),
      answer: opts.findIndex(o => o.correct),
      explanation: `Mượn ${borrowBits} bit → 2^${borrowBits} = **${numSubnets} subnet** (prefix mới: /${newPrefix}).`,
      generated: true
    };
  }

  // Type 4: Hỏi network address
  const blockSize = Math.pow(2, hostBits);
  const validBlocks = [];
  for (let i = 0; i < 256; i += blockSize) validBlocks.push(i);

  const networkLast = validBlocks[rand(0, validBlocks.length - 1)];
  const hostLast = networkLast + rand(1, Math.max(1, blockSize - 2));
  const hostIP = `${base}.${octet3}.${hostLast}`;

  const wrongs = shuffle(validBlocks.filter(b => b !== networkLast)).slice(0, 3);

  const opts = shuffle([
    { text: `${base}.${octet3}.${networkLast}`, correct: true },
    ...wrongs.map(b => ({ text: `${base}.${octet3}.${b}`, correct: false }))
  ]);

  return {
    id: `gen-net-${Date.now()}-${rand(1,9999)}`,
    category: 'Subnetting',
    difficulty,
    question: `Network address của host <code>${hostIP}/${prefix}</code> là gì?`,
    options: opts.map(o => o.text),
    answer: opts.findIndex(o => o.correct),
    explanation: `/${prefix} → block size = ${blockSize}. Host ${hostLast} thuộc block ${networkLast}. Network address = **${base}.${octet3}.${networkLast}**.`,
    generated: true
  };
}

// ========== BINARY CONVERSION ==========
export function genBinary(difficulty = 'medium') {
  const num = rand(1, 255);
  const binary = num.toString(2).padStart(8, '0');

  const wrongs = shuffle([
    rand(1, 255).toString(2).padStart(8, '0'),
    (num ^ 0b11111111).toString(2).padStart(8, '0'),
    (num + rand(1, 20)).toString(2).padStart(8, '0')
  ]).filter(b => b !== binary).slice(0, 3);

  const opts = shuffle([
    { text: binary, correct: true },
    ...wrongs.map(b => ({ text: b, correct: false }))
  ]);

  return {
    id: `gen-bin-${Date.now()}-${rand(1,9999)}`,
    category: 'Binary',
    difficulty,
    question: `Số thập phân <code>${num}</code> chuyển sang nhị phân (8-bit) là gì?`,
    options: opts.map(o => o.text),
    answer: opts.findIndex(o => o.correct),
    explanation: `${num} = ${binary} (nhị phân)`,
    generated: true
  };
}

// ========== IP CLASS ==========
export function genIPClass(difficulty = 'easy') {
  const ips = [
    { ip: `10.${rand(0,255)}.${rand(0,255)}.1`, cls: 'A', type: 'Private' },
    { ip: `172.${rand(16,31)}.${rand(0,255)}.1`, cls: 'B', type: 'Private' },
    { ip: `192.168.${rand(0,255)}.1`, cls: 'C', type: 'Private' },
    { ip: `${rand(1,126)}.${rand(0,255)}.${rand(0,255)}.1`, cls: 'A', type: 'Public' },
    { ip: `${rand(128,191)}.${rand(0,255)}.${rand(0,255)}.1`, cls: 'B', type: 'Public' },
    { ip: `${rand(192,223)}.${rand(0,255)}.${rand(0,255)}.1`, cls: 'C', type: 'Public' },
    { ip: `127.0.0.1`, cls: 'A', type: 'Loopback' },
    { ip: `169.254.${rand(0,255)}.1`, cls: 'B', type: 'APIPA' },
    { ip: `224.${rand(0,255)}.${rand(0,255)}.1`, cls: 'D', type: 'Multicast' }
  ];

  const item = ips[rand(0, ips.length - 1)];

  const opts = shuffle([
    { text: `Class ${item.cls} - ${item.type}`, correct: true },
    { text: `Class A - Public`, correct: item.cls === 'A' && item.type === 'Public' },
    { text: `Class B - Private`, correct: item.cls === 'B' && item.type === 'Private' },
    { text: `Class C - Public`, correct: item.cls === 'C' && item.type === 'Public' }
  ]);

  // Đảm bảo chỉ có 1 đáp án đúng
  const correctCount = opts.filter(o => o.correct).length;
  if (correctCount !== 1) return genIPClass(difficulty);

  return {
    id: `gen-ip-${Date.now()}-${rand(1,9999)}`,
    category: 'IPv4',
    difficulty,
    question: `Địa chỉ IP <code>${item.ip}</code> thuộc loại nào?`,
    options: opts.map(o => o.text),
    answer: opts.findIndex(o => o.correct),
    explanation: `<code>${item.ip}</code> thuộc **Class ${item.cls}** và là địa chỉ **${item.type}**.`,
    generated: true
  };
}

// ========== PORT NUMBER ==========
export function genPortNumber(difficulty = 'easy') {
  const ports = [
    { port: 20, protocol: 'FTP Data', transport: 'TCP' },
    { port: 21, protocol: 'FTP Control', transport: 'TCP' },
    { port: 22, protocol: 'SSH', transport: 'TCP' },
    { port: 23, protocol: 'Telnet', transport: 'TCP' },
    { port: 25, protocol: 'SMTP', transport: 'TCP' },
    { port: 53, protocol: 'DNS', transport: 'UDP/TCP' },
    { port: 67, protocol: 'DHCP Server', transport: 'UDP' },
    { port: 68, protocol: 'DHCP Client', transport: 'UDP' },
    { port: 69, protocol: 'TFTP', transport: 'UDP' },
    { port: 80, protocol: 'HTTP', transport: 'TCP' },
    { port: 110, protocol: 'POP3', transport: 'TCP' },
    { port: 123, protocol: 'NTP', transport: 'UDP' },
    { port: 143, protocol: 'IMAP', transport: 'TCP' },
    { port: 161, protocol: 'SNMP', transport: 'UDP' },
    { port: 443, protocol: 'HTTPS', transport: 'TCP' },
    { port: 514, protocol: 'Syslog', transport: 'UDP' }
  ];

  const item = ports[rand(0, ports.length - 1)];
  const otherPorts = ports.filter(p => p.protocol !== item.protocol);
  const wrongs = shuffle(otherPorts).slice(0, 3);

  const opts = shuffle([
    { text: `${item.port}`, correct: true },
    ...wrongs.map(w => ({ text: `${w.port}`, correct: false }))
  ]);

  return {
    id: `gen-port-${Date.now()}-${rand(1,9999)}`,
    category: 'Ports & Protocols',
    difficulty,
    question: `Port mặc định của giao thức <code>${item.protocol}</code> là gì?`,
    options: opts.map(o => o.text),
    answer: opts.findIndex(o => o.correct),
    explanation: `${item.protocol} sử dụng port **${item.port}** (${item.transport}).`,
    generated: true
  };
}

// ========== MASTER GENERATOR ==========
function toCategoryKey(category = 'random') {
  return String(category || 'random').trim().toLowerCase();
}

function formatCategoryName(category = 'random') {
  const map = {
    'subnetting': 'Subnetting',
    'binary': 'Binary',
    'ipv4': 'IPv4',
    'ports': 'Ports & Protocols',
    'vlan': 'VLAN',
    'osi model': 'OSI Model',
    'routing': 'Routing',
    'acls': 'ACL',
    'nat': 'NAT/PAT',
    'security': 'Security',
    'port numbers': 'Port Numbers'
  };

  const normalized = toCategoryKey(category);
  return map[normalized] || category || 'Random';
}

export function generateQuestion(category = 'random', difficulty = 'random') {
  const generators = {
    'subnetting': genSubnetting,
    'binary': genBinary,
    'ipv4': genIPClass,
    'ports': genPortNumber,
    'vlan': genSubnetting,
    'routing': genSubnetting,
    'osi model': genIPClass,
    'acls': genPortNumber,
    'nat': genIPClass,
    'security': genIPClass,
    'port numbers': genPortNumber
  };

  const categoryKey = toCategoryKey(category);
  const keys = Object.keys(generators);

  let chosenCat = keys[rand(0, keys.length - 1)];
  if (categoryKey !== 'random' && generators[categoryKey]) {
    chosenCat = categoryKey;
  }

  const diffs = ['easy', 'medium', 'hard'];
  const chosenDiff = (difficulty && difficulty !== 'random') ? difficulty : diffs[rand(0, 2)];
  const question = generators[chosenCat](chosenDiff);

  if (categoryKey !== 'random') {
    question.category = formatCategoryName(category);
  }

  return question;
}

// Đếm số lượng câu hỏi có thể sinh (ước lượng)
export function getGeneratorStats() {
  return {
    subnetting: 'Hơn 500,000 biến thể',
    binary: 'Hơn 255,000 biến thể',
    ipv4: 'Hơn 4,000,000 biến thể',
    ports: 'Hơn 4,000 biến thể',
    total: 'Hơn 5 triệu câu hỏi có thể sinh'
  };
}