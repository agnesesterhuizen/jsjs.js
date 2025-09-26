function huffmanEncoding(data) {
  const freqCounter = {};

  let i = 0;
  while (i < data.length) {
    const char = data[i];
    freqCounter[char] = (freqCounter[char] || 0) + 1;
    i = i + 1;
  }

  const priorityQueue = new PriorityQueue();

  const chars = Object.keys(freqCounter);
  let j = 0;
  while (j < chars.length) {
    const char = chars[j];
    priorityQueue.enqueue(new HuffmanNode(char, freqCounter[char]));
    j = j + 1;
  }

  while (priorityQueue.size() > 1) {
    const leftNode = priorityQueue.dequeue();
    const rightNode = priorityQueue.dequeue();
    const combinedFreq = leftNode.freq + rightNode.freq;
    priorityQueue.enqueue(
      new HuffmanNode(null, combinedFreq, leftNode, rightNode)
    );
  }

  const huffmanCode = {};
  generateCode(priorityQueue.peek(), "", huffmanCode);

  let encodedData = "";

  let k = 0;
  while (k < data.length) {
    const char = data[k];
    encodedData = encodedData + huffmanCode[char];
    k = k + 1;
  }

  return encodedData;
}

class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(node) {
    let added = false;
    let i = 0;
    while (i < this.queue.length) {
      if (node.freq < this.queue[i].freq) {
        this.queue.splice(i, 0, node);
        added = true;
        break;
      }
      i = i + 1;
    }
    if (!added) {
      this.queue.push(node);
    }
  }

  dequeue() {
    return this.queue.shift();
  }

  size() {
    return this.queue.length;
  }

  peek() {
    return this.queue[0];
  }
}

class HuffmanNode {
  constructor(char, freq, left, right) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

function generateCode(node, code, huffmanCode) {
  if (node.char) {
    huffmanCode[node.char] = code;
    return;
  }
  generateCode(node.left, code + "0", huffmanCode);
  generateCode(node.right, code + "1", huffmanCode);
}

console.log(huffmanEncoding("aaaaabbbcccc"));
