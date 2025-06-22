// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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

let currentCategory = 'All';
let currentSubcategory = null;
let editDocId = null;
  


  // Category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.dataset.category) {
        currentCategory = e.target.dataset.category;
        currentSubcategory = null;
        loadStock();
      }
    });
  });

  // Subcategory buttons
  document.querySelectorAll('.subcategory-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentCategory = 'Phones';
      currentSubcategory = e.target.dataset.subcategory;
      loadStock();
    });
  });

  // Category change handler
  document.getElementById('prodCategory').addEventListener('change', (e) => {
    document.getElementById('prodSubcategory').style.display = 
      e.target.value === 'Phones' ? 'block' : 'none';
  });

  // Product form handling
  document.getElementById('addProductBtn').addEventListener('click', showAddProductForm);
  document.getElementById('cancelBtn').addEventListener('click', hideAddProductForm);
  document.getElementById('addProductForm').addEventListener('submit', handleFormSubmit);
});

// Load stock with filtering
async function loadStock() {
  let query = db.collection('stockmgt');
  
  if (currentCategory !== 'All') {
    if (currentCategory === 'Phones' && currentSubcategory) {
      query = query.where('category', '==', 'Phones')
                  .where('subcategory', '==', currentSubcategory);
    } else {
      query = query.where('category', '==', currentCategory);
    }
  }
  
  const snapshot = await query.get();
  const tbody = document.getElementById('stockTableBody');
  tbody.innerHTML = '';
  
  snapshot.forEach(doc => {
    const item = doc.data();
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', doc.id);
    tr.innerHTML = `
      <td>${item.barcode}</td>
      <td>${item.itemName}</td>
      <td>${item.category}</td>
      <td>${item.subcategory || ''}</td>
      <td>${item.description || ''}</td>
      <td>${item.costPrice.toFixed(2)}</td>
      <td>${item.sellingPrice.toFixed(2)}</td>
      <td>${item.stockQty}</td>
    `;
    tr.addEventListener('click', () => populateFormForEdit(doc.id, item));
    tbody.appendChild(tr);
  });
}

// USB Barcode Scanner Integration
document.getElementById('prodBarcode').addEventListener('keydown', function(e) {
  // Listen for Enter key (barcode scanners typically send Enter after scanning)
  if (e.key === 'Enter') {
    e.preventDefault();
    processBarcode(this.value);
    this.value = ''; // Clear for next scan
  }
});

async function processBarcode(barcode) {
  // Check if product exists
  const productSnap = await db.collection('stockmgt').where('barcode', '==', barcode).limit(1).get();
  
  if (!productSnap.empty) {
    const product = productSnap.docs[0].data();
    alert(`Product found: ${product.itemName}\nStock: ${product.stockQty}`);
  } else {
    // Prepare form for new product
    showAddProductForm();
    document.getElementById('prodBarcode').value = barcode;
    document.getElementById('prodBarcode').disabled = true;
  }
}

// Add/Edit product functions
function showAddProductForm() {
  resetForm();
  document.getElementById('formTitle').textContent = 'Add New Product';
  document.getElementById('formSubmitBtn').textContent = 'Add Product';
  editDocId = null;
  document.getElementById('addProductSection').style.display = 'block';
}

function hideAddProductForm() {
  document.getElementById('addProductSection').style.display = 'none';
  resetForm();
}

function resetForm() {
  document.getElementById('addProductForm').reset();
  document.getElementById('prodSubcategory').style.display = 'none';
  editDocId = null;
}

function populateFormForEdit(docId, item) {
  editDocId = docId;
  document.getElementById('formTitle').textContent = 'Edit Product';
  document.getElementById('formSubmitBtn').textContent = 'Update Product';

  document.getElementById('prodBarcode').value = item.barcode;
  document.getElementById('prodBarcode').disabled = true;
  document.getElementById('prodName').value = item.itemName;
  document.getElementById('prodCategory').value = item.category;
  
  if (item.category === 'Phones' && item.subcategory) {
    document.getElementById('prodSubcategory').style.display = 'block';
    document.getElementById('prodSubcategory').value = item.subcategory;
  }
  
  document.getElementById('prodDescription').value = item.description || '';
  document.getElementById('prodCostPrice').value = item.costPrice;
  document.getElementById('prodSellingPrice').value = item.sellingPrice;
  document.getElementById('prodStockQty').value = item.stockQty;

  document.getElementById('addProductSection').style.display = 'block';
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const barcode = document.getElementById('prodBarcode').value.trim();
  const itemName = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const subcategory = category === 'Phones' ? 
      document.getElementById('prodSubcategory').value : null;
  const description = document.getElementById('prodDescription').value.trim();
  const costPrice = parseFloat(document.getElementById('prodCostPrice').value);
  const sellingPrice = parseFloat(document.getElementById('prodSellingPrice').value);
  const stockQty = parseInt(document.getElementById('prodStockQty').value);

  // Validation
  if (!barcode || !itemName || !category || isNaN(costPrice) || 
      isNaN(sellingPrice) || isNaN(stockQty)) {
    alert('Please fill all required fields correctly.');
    return;
  }

  const productData = {
    barcode,
    itemName,
    category,
    description,
    costPrice,
    sellingPrice,
    stockQty
  };

  if (category === 'Phones' && subcategory) {
    productData.subcategory = subcategory;
  }

  if (editDocId) {
    // Update existing product
    await db.collection('stockmgt').doc(editDocId).update(productData);
    alert('Product updated successfully!');
  } else {
    // Check barcode uniqueness
    const existing = await db.collection('stockmgt').where('barcode', '==', barcode).get();
    if (!existing.empty) {
      alert('Barcode already exists!');
      return;
    }
    // Add new product
    await db.collection('stockmgt').add(productData);
    alert('Product added successfully!');
  }

  hideAddProductForm();
  loadStock();
}
