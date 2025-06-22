// Import the functions you need from the SDKs you need
 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
 import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
 // https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
 const firebaseConfig = {
 apiKey: "AIzaSyD2WZnOuDXBLXR7uAq_LTK46q7tr13Mqvw",
 authDomain: "gadendigitech.firebaseapp.com",
 projectId: "gadendigitech",
 storageBucket: "gadendigitech.firebasestorage.app",
 messagingSenderId: "134032321432",
 appId: "1:134032321432:web:dedbb189a68980661259ed",
 measurementId: "G-VLG9G3FCP0"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let lastProduct = null; // For showing product details after scan

// Redirect if not logged in
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location = 'index.html';
  } else {
    loadCreditSales();
    loadSalesRecords();
    calculateProfit();
    focusBarcode();
  }
});

// Logout button
document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => window.location = 'index.html');
});

// Focus barcode input for USB scanner
function focusBarcode() {
  const barcodeInput = document.getElementById('saleBarcode');
  if (barcodeInput) barcodeInput.focus();
}

// Show product name/price instantly after barcode input
document.getElementById('saleBarcode').addEventListener('input', async function () {
  const barcode = this.value.trim();
  if (barcode.length === 0) {
    document.getElementById('productInfo').textContent = '';
    lastProduct = null;
    return;
  }
  const productSnap = await db.collection('stockmgt').where('barcode', '==', barcode).limit(1).get();
  if (!productSnap.empty) {
    const product = productSnap.docs[0].data();
    lastProduct = product;
    document.getElementById('productInfo').textContent = `Product: ${product.itemName} | Price: KSH ${product.sellingPrice} | Stock: ${product.stockQty}`;
  } else {
    document.getElementById('productInfo').textContent = 'Product not found!';
    lastProduct = null;
  }
});

// Update total amount when quantity changes
document.getElementById('saleQuantity').addEventListener('input', function () {
  if (lastProduct) {
    const qty = parseInt(this.value) || 0;
    document.getElementById('saleTotal').value = (lastProduct.sellingPrice * qty).toFixed(2);
  }
});

// Record a sale and generate receipt
document.getElementById('salesForm').addEventListener('submit', async e => {
  e.preventDefault();
  const date = document.getElementById('saleDate').value;
  const clientName = document.getElementById('clientName').value.trim();
  const clientPhone = document.getElementById('clientPhone').value.trim();
  const barcode = document.getElementById('saleBarcode').value.trim();
  const quantity = parseInt(document.getElementById('saleQuantity').value);
  const saleType = document.getElementById('saleType').value;

  if (!date || !clientName || !barcode || isNaN(quantity) || quantity <= 0) {
    alert('Please fill all required fields correctly.');
    focusBarcode();
    return;
  }

  // Find product by barcode
  const productSnap = await db.collection('stockmgt').where('barcode', '==', barcode).limit(1).get();
  if (productSnap.empty) {
    alert('Product not found!');
    focusBarcode();
    return;
  }
  const productDoc = productSnap.docs[0];
  const product = productDoc.data();

  if (product.stockQty < quantity) {
    alert('Insufficient stock!');
    focusBarcode();
    return;
  }

  const totalCost = product.costPrice * quantity;
  const totalSale = product.sellingPrice * quantity;

  if (saleType === 'cash') {
    // Cash sale
    const saleRef = await db.collection('sales').add({
      date, clientName, clientPhone, barcode, quantity,
      itemName: product.itemName,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      totalCost, totalSale,
      saleType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update stock
    await productDoc.ref.update({
      stockQty: product.stockQty - quantity
    });

    alert('Cash sale recorded!');
    generateReceipt({
      id: saleRef.id,
      date,
      clientName,
      clientPhone,
      itemName: product.itemName,
      quantity,
      sellingPrice: product.sellingPrice
    });

    // Minimum stock alert
    if (product.stockQty - quantity < 5) {
      alert(`Warning: Stock for ${product.itemName} is low (${product.stockQty - quantity})`);
    }

  } else {
    // Credit sale
    await db.collection('creditSales').add({
      date, clientName, clientPhone, barcode, quantity,
      itemName: product.itemName,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      creditAmount: totalSale,
      amountPaid: 0,
      balance: totalSale,
      dueDate: '', // Optional: add UI for due date
      status: 'Pending',
      saleType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update stock
    await productDoc.ref.update({
      stockQty: product.stockQty - quantity
    });

    alert('Credit sale recorded!');
    if (product.stockQty - quantity < 5) {
      alert(`Warning: Stock for ${product.itemName} is low (${product.stockQty - quantity})`);
    }
  }

  loadCreditSales();
  loadSalesRecords();
  calculateProfit();
  e.target.reset();
  document.getElementById('productInfo').textContent = '';
  document.getElementById('saleTotal').value = '';
  lastProduct = null;
  focusBarcode();
});

// --- Sales Records Table with Date Filter and Print Receipt ---
async function loadSalesRecords() {
  const tbody = document.getElementById('salesRecordsTableBody');
  const filterDate = document.getElementById('filterSalesDate')?.value;
  let query = db.collection('sales').orderBy('date', 'desc');
  if (filterDate) {
    query = query.where('date', '==', filterDate);
  }
  const snapshot = await query.get();
  tbody.innerHTML = '';
  snapshot.forEach(doc => {
    const sale = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.clientName}</td>
      <td>${sale.clientPhone}</td>
      <td>${sale.itemName}</td>
      <td>${sale.barcode}</td>
      <td>${sale.quantity}</td>
      <td>${sale.sellingPrice.toFixed(2)}</td>
      <td>${sale.totalSale.toFixed(2)}</td>
      <td><button onclick="generateReceiptById('${doc.id}')">Print</button></td>
    `;
    tbody.appendChild(tr);
  });
}
window.loadSalesRecords = loadSalesRecords;

function generateReceiptById(id) {
  db.collection('sales').doc(id).get().then(doc => {
    if (doc.exists) {
      const sale = doc.data();
      generateReceipt({
        id: doc.id,
        ...sale
      });
    }
  });
}
window.generateReceiptById = generateReceiptById;

// --- Credit Sales Table ---
async function loadCreditSales() {
  const snapshot = await db.collection('creditSales').orderBy('date', 'desc').get();
  const tbody = document.getElementById('creditSalesTableBody');
  tbody.innerHTML = '';
  snapshot.forEach(doc => {
    const sale = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.clientName}</td>
      <td>${sale.clientPhone}</td>
      <td>${sale.itemName}</td>
      <td>${sale.quantity}</td>
      <td>${sale.creditAmount.toFixed(2)}</td>
      <td>${sale.amountPaid.toFixed(2)}</td>
      <td>${sale.balance.toFixed(2)}</td>
      <td>${sale.dueDate || 'N/A'}</td>
      <td>${sale.status}</td>
      <td>
        <button onclick="payCredit('${doc.id}')">Pay</button>
        <button onclick="deleteCredit('${doc.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.loadCreditSales = loadCreditSales;

// Pay credit
async function payCredit(id) {
  const paymentStr = prompt('Enter payment amount:');
  const payment = parseFloat(paymentStr);
  if (isNaN(payment) || payment <= 0) {
    alert('Invalid payment amount');
    return;
  }
  const docRef = db.collection('creditSales').doc(id);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    alert('Credit sale not found');
    return;
  }
  const data = docSnap.data();
  let newAmountPaid = data.amountPaid + payment;
  let newBalance = data.balance - payment;
  if (newBalance < 0) {
    alert('Payment exceeds balance');
    return;
  }
  let newStatus = newBalance === 0 ? 'Paid' : 'Pending';

  await docRef.update({
    amountPaid: newAmountPaid,
    balance: newBalance,
    status: newStatus
  });
  alert('Payment recorded');
  loadCreditSales();
  calculateProfit();
}
window.payCredit = payCredit;

// Delete credit sale
async function deleteCredit(id) {
  if (confirm('Are you sure you want to delete this credit sale?')) {
    await db.collection('creditSales').doc(id).delete();
    alert('Deleted');
    loadCreditSales();
  }
}
window.deleteCredit = deleteCredit;

// Calculate profit & loss
async function calculateProfit() {
  const salesSnap = await db.collection('sales').get();
  const creditSnap = await db.collection('creditSales').get();
  let totalSales = 0, totalCost = 0;

  salesSnap.forEach(doc => {
    const s = doc.data();
    totalSales += s.totalSale || 0;
    totalCost += s.totalCost || 0;
  });

  creditSnap.forEach(doc => {
    const c = doc.data();
    totalSales += c.creditAmount || 0;
    totalCost += (c.costPrice * c.quantity) || 0;
  });

  document.getElementById('totalSales').textContent = totalSales.toFixed(2);
  document.getElementById('totalCost').textContent = totalCost.toFixed(2);
  document.getElementById('profit').textContent = (totalSales - totalCost).toFixed(2);
}
window.calculateProfit = calculateProfit;

// Barcode scanner setup (for camera-based, not USB; USB works as keyboard)
function startScanner() {
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#barcode-scanner'),
      constraints: {
        width: 320,
        height: 240,
        facingMode: "environment"
      }
    },
    decoder: {
      readers: ["code_128_reader", "ean_reader", "ean_8_reader"]
    }
  }, err => {
    if (err) {
      console.error(err);
      alert('Error starting scanner');
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(result => {
    const code = result.codeResult.code;
    document.getElementById('scannedBarcode').textContent = code;
    document.getElementById('saleBarcode').value = code;
    document.getElementById('saleBarcode').dispatchEvent(new Event('input'));
    Quagga.stop();
  });
}
window.startScanner = startScanner;

function stopScanner() {
  Quagga.stop();
}
window.stopScanner = stopScanner;

// Generate PDF receipt using PDFMake
function generateReceipt(saleData) {
  const docDefinition = {
    content: [
      { text: 'Gaden Digitech Limited', style: 'header' },
      { text: 'SALES RECEIPT', style: 'subheader', margin: [0, 0, 0, 10] },
      { text: `Date: ${saleData.date}` },
      { text: `Receipt No: ${saleData.id || '(auto)'}` },
      { text: `Client: ${saleData.clientName}` },
      { text: `Phone: ${saleData.clientPhone}` },
      { text: '\n' },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Product', bold: true },
              { text: 'Qty', bold: true },
              { text: 'Unit Price', bold: true },
              { text: 'Total', bold: true }
            ],
            [
              saleData.itemName,
              saleData.quantity,
              saleData.sellingPrice.toFixed(2),
              (saleData.sellingPrice * saleData.quantity).toFixed(2)
            ]
          ]
        }
      },
      { text: '\n' },
      { text: `Total Amount: KSH ${(saleData.sellingPrice * saleData.quantity).toFixed(2)}`, bold: true },
      { text: '\nThank you for your business!', italics: true }
    ],
    styles: {
      header: { fontSize: 20, bold: true, alignment: 'center' },
      subheader: { fontSize: 16, bold: true, alignment: 'center' }
    }
  };
  pdfMake.createPdf(docDefinition).open();
}
window.generateReceipt = generateReceipt;

// --- Filter sales by date ---
document.getElementById('filterSalesBtn')?.addEventListener('click', loadSalesRecords);

// --- Auto-focus barcode input on page load ---
window.onload = () => {
  loadCreditSales();
  loadSalesRecords();
  calculateProfit();
  focusBarcode();
};
