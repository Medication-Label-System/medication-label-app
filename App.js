import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import pharmacyLogo from './assets/logo.png';

// ✅ Use Netlify functions - no external backend needed!
const API_BASE_URL = window.location.origin;

function App() {
  const [user, setUser] = useState(null);
  const [medications, setMedications] = useState([]);
  const [basket, setBasket] = useState([]);
  const [patients, setPatients] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [customInstruction, setCustomInstruction] = useState('');
  const [useCustomInstruction, setUseCustomInstruction] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(1);
  const [auditLogs, setAuditLogs] = useState([]);

  // Generate months (01-12) and years (26-50)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: `${(i + 1).toString().padStart(2, '0')} - ${new Date(2000, i).toLocaleString('en', { month: 'long' })}`
  }));
  
  const years = Array.from({ length: 25 }, (_, i) => ({
    value: (i + 26).toString(),
    label: `20${(i + 26).toString()}`
  }));

  // Load medications on startup
  useEffect(() => {
    loadMedications();
    loadLocalAuditLogs();
  }, []);

  // Load medications from Netlify function
  const loadMedications = async () => {
    try {
      const response = await axios.get('/.netlify/functions/medications');
      setMedications(response.data.medications);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  // Search patient from Netlify function
  const searchPatient = async (patientId, year) => {
    if (!patientId || !year) {
      alert('Please enter both Patient ID and Year');
      return;
    }

    try {
      const response = await axios.get(`/.netlify/functions/patients-search?patientId=${patientId}&year=${year}`);
      if (response.data.success) {
        setPatients({
          ...response.data.patient,
          fullId: response.data.fullId
        });
      } else {
        alert('Patient not found: ' + response.data.message);
        setPatients(null);
      }
    } catch (error) {
      alert('Error searching patient: ' + error.message);
      setPatients(null);
    }
  };

  // Login with Netlify function
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/.netlify/functions/auth-login', loginData);
      if (response.data.success) {
        setUser(response.data.user);
        alert(`Welcome ${response.data.user.fullName}!`);
      } else {
        alert('Login failed: ' + response.data.message);
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
  };

  // Load basket from Netlify function
  const loadBasket = async () => {
    try {
      const response = await axios.get('/.netlify/functions/basket');
      const basketWithExpiry = response.data.basket.map(item => {
        const expiryDate = item.expiryDate || '';
        const [month, year] = expiryDate.split('/');
        return {
          ...item,
          expiryDate,
          expiryMonth: month || '',
          expiryYear: year || ''
        };
      });
      setBasket(basketWithExpiry);
    } catch (error) {
      console.error('Error loading basket:', error);
    }
  };

  // Add to basket with Netlify function
  const addToBasket = async (medication) => {
    if (!patients) {
      alert('Please search and select a patient first!');
      return;
    }

    const instructionToUse = useCustomInstruction && customInstruction 
      ? customInstruction 
      : medication.Instruction;

    try {
      await axios.post('/.netlify/functions/basket', {
        drugName: medication.DrugName,
        instructionText: instructionToUse
      });
      
      loadBasket();
      
      if (useCustomInstruction) {
        setCustomInstruction('');
        setUseCustomInstruction(false);
      }
      
      alert(`Added ${medication.DrugName} to basket`);
    } catch (error) {
      alert('Error adding to basket: ' + error.message);
    }
  };

  // Clear basket with Netlify function
  const clearBasket = async () => {
    try {
      await axios.delete('/.netlify/functions/basket');
      setBasket([]);
      alert('Basket cleared successfully');
    } catch (error) {
      alert('Error clearing basket: ' + error.message);
    }
  };

  // Remove from basket
  const removeFromBasket = async (tempId) => {
    setBasket(prev => prev.filter(item => item.TempID !== tempId));
  };

  // Expiry date handlers
  const handleExpiryMonthChange = (tempId, month) => {
    setBasket(prevBasket => 
      prevBasket.map(item => {
        if (item.TempID === tempId) {
          const newExpiryDate = month && item.expiryYear ? `${month}/${item.expiryYear}` : '';
          return {
            ...item,
            expiryMonth: month,
            expiryDate: newExpiryDate
          };
        }
        return item;
      })
    );
  };

  const handleExpiryYearChange = (tempId, year) => {
    setBasket(prevBasket => 
      prevBasket.map(item => {
        if (item.TempID === tempId) {
          const newExpiryDate = item.expiryMonth && year ? `${item.expiryMonth}/${year}` : '';
          return {
            ...item,
            expiryYear: year,
            expiryDate: newExpiryDate
          };
        }
        return item;
      })
    );
  };

  // Local storage audit
  const saveToLocalAudit = async () => {
    try {
      const timestamp = new Date().toISOString();
      const printSessionId = Date.now().toString();
      
      const localAuditEntries = basket.map((item, index) => ({
        id: `${printSessionId}-${index}`,
        timestamp,
        printSessionId,
        patientId: patients.PatientID,
        patientYear: patients.Year,
        patientName: patients.PatientName,
        drugName: item.DrugName,
        instructionText: item.InstructionText,
        printedBy: user.fullName,
        expiryDate: item.expiryDate,
        printQuantity,
        status: 'printed'
      }));

      const existingLogs = JSON.parse(localStorage.getItem('medicationAuditLogs') || '[]');
      const updatedLogs = [...existingLogs, ...localAuditEntries];
      localStorage.setItem('medicationAuditLogs', JSON.stringify(updatedLogs));
      
      setAuditLogs(updatedLogs);
      return localAuditEntries;
    } catch (error) {
      console.error('Error saving to local audit:', error);
      return [];
    }
  };

  const loadLocalAuditLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('medicationAuditLogs') || '[]');
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading local audit logs:', error);
    }
  };

  const clearLocalAuditLogs = () => {
    if (window.confirm('Are you sure you want to clear all local audit logs?')) {
      localStorage.removeItem('medicationAuditLogs');
      setAuditLogs([]);
      alert('Local audit logs cleared successfully');
    }
  };

  // Print function
  const generatePrintPreview = () => {
    if (!patients || basket.length === 0 || !user) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-GB');
    const logoUrl = pharmacyLogo;
    
    let labelsHTML = '';

    basket.forEach(item => {
      for (let i = 0; i < printQuantity; i++) {
        let displayExpiry = item.expiryDate;
        if (item.expiryDate && item.expiryDate.includes('/')) {
          const [month, year] = item.expiryDate.split('/');
          displayExpiry = `${month}/20${year}`;
        }
        
        labelsHTML += `
          <div class="label-container">
            <div class="label-content">
              <div class="label-header">
                <div class="logo-container">
                  <img src="${logoUrl}" alt="Pharmacy Logo" class="logo-image" onerror="this.style.display='none'" />
                </div>
                <div class="patient-id">ID: ${patients.fullId}</div>
              </div>
              <div class="patient-name"><strong>${patients.PatientName}</strong></div>
              <div class="drug-name"><strong>${item.DrugName}</strong></div>
              <div class="instructions"><span>${item.InstructionText}</span></div>
              <div class="label-footer">
                <div class="footer-line">
                  <span>Exp: ${displayExpiry}</span>
                  <span>By: Dr Mahmoud</span>
                </div>
                <div class="footer-date"><span>${currentDate}</span></div>
              </div>
            </div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medication Labels</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0 !important; padding: 0 !important; background: white; font-family: Arial; }
          .label-container { width: 4cm !important; height: 2.5cm !important; border: 0.5px solid #000; padding: 1mm; margin: 0 !important; page-break-after: always; display: flex; flex-direction: column; overflow: hidden; }
          .label-content { flex: 1; display: flex; flex-direction: column; height: 100%; }
          .label-header { height: 0.4cm; display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.5mm; border-bottom: 0.5px solid #000; }
          .logo-image { max-height: 0.3cm; max-width: 70%; width: auto; object-fit: contain; }
          .patient-id { flex: 1; text-align: right; font-size: 4pt; }
          .patient-name { height: 0.25cm; text-align: center; margin: 0.3mm 0; padding: 0.5mm 0; line-height: 1; overflow: hidden; border-bottom: 0.5px solid #000; font-size: 5pt; }
          .patient-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .drug-name { height: 0.25cm; text-align: center; margin: 0.1mm 0; padding: 0.3mm 0; line-height: 1; overflow: hidden; border-bottom: 0.5px solid #000; font-size: 5pt; }
          .drug-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .instructions { flex: 1; min-height: 0.8cm; margin: 0.1mm 0; padding: 0.5mm; line-height: 1.1; overflow: hidden; border-bottom: 0.5px solid #000; font-size: 5pt; }
          .instructions span { display: block; word-wrap: break-word; line-height: 1.2; height: 100%; overflow: hidden; text-align: center; direction: rtl; }
          .label-footer { height: 0.3cm; font-size: 4pt; display: flex; flex-direction: column; justify-content: space-between; padding-top: 0.2mm; }
          .footer-line { display: flex; justify-content: space-between; }
          .footer-date { text-align: center; }
          @media print {
            @page { margin: 0 !important; padding: 0 !important; size: 4cm 2.5cm !important; }
            body { margin: 0 !important; padding: 0 !important; width: 4cm !important; height: 2.5cm !important; }
            .label-container { width: 4cm !important; height: 2.5cm !important; margin: 0 !important; padding: 1mm !important; page-break-after: always; }
            body * { visibility: hidden; }
            .label-container, .label-container * { visibility: visible; }
          }
        </style>
      </head>
      <body>${labelsHTML}</body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print labels
  const printLabels = async () => {
    if (!patients) {
      alert('Please search and select a patient first!');
      return;
    }

    if (basket.length === 0) {
      alert('Basket is empty. Please add medications first.');
      return;
    }

    const medicationsWithoutExpiry = basket.filter(item => !item.expiryDate);
    if (medicationsWithoutExpiry.length > 0) {
      const missingItems = medicationsWithoutExpiry.map(item => item.DrugName).join(', ');
      alert(`Please enter expiry dates for all medications in the basket.\n\nMissing expiry dates for: ${missingItems}`);
      return;
    }

    if (!user) {
      alert('User not logged in');
      return;
    }

    try {
      generatePrintPreview();
      await saveToLocalAudit();
      await clearBasket();
      alert('Labels printed successfully!');
    } catch (error) {
      console.error('Print error:', error);
      alert('Print completed, but there was an issue with audit logging. Check console for details.');
    }
  };

  // Quick patient search
  const handleQuickPatientSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const patientId = formData.get('patientId');
    const year = formData.get('year');
    searchPatient(patientId, year);
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setPatients(null);
    setBasket([]);
    setLoginData({ username: '', password: '' });
  };

  // Search function
  const filterMedications = (medications, searchTerm) => {
    if (!searchTerm.trim()) return medications;
    
    const searchText = searchTerm.trim().toLowerCase();
    
    const filtered = medications.filter(medication => {
      const drugName = (medication.DrugName || '').toLowerCase();
      const instruction = (medication.Instruction || '').toLowerCase();
      
      const nameMatch = drugName.includes(searchText);
      const instructionMatch = instruction.includes(searchText);
      return nameMatch || instructionMatch;
    });
    
    return filtered;
  };

  // Create unique keys
  const createUniqueKey = (medication, index) => {
    return `${medication.DrugName}-${index}-${medication.InternationalCode || ''}`;
  };

  // Get filtered medications
  const filteredMedications = filterMedications(medications, searchTerm);

  // If not logged in, show login form
  if (!user) {
    return (
      <div className="App login-container">
        <div className="login-box">
          <h1>💊 Medication Label System</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username:</label>
              <input 
                type="text" 
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input 
                type="password" 
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required 
              />
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <div className="App">
      <header className="app-header">
        <h1>💊 Medication Label Printing System</h1>
        <div className="user-info">
          <span>Welcome, <strong>{user.fullName}</strong></span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="main-container">
        <div className="left-panel">
          <div className="section patient-search">
            <h2>🔍 Patient Search</h2>
            <form onSubmit={handleQuickPatientSearch} className="search-form">
              <div className="input-group">
                <input type="text" name="patientId" placeholder="Patient ID" required />
                <input type="text" name="year" placeholder="Year" defaultValue="2025" required />
                <button type="submit">Search Patient</button>
              </div>
            </form>
            
            {patients && (
              <div className="patient-info">
                <h3>✅ Patient Found</h3>
                <p><strong>Name:</strong> {patients.PatientName}</p>
                <p><strong>ID:</strong> {patients.fullId}</p>
                <p><strong>National ID:</strong> {patients.NationalID}</p>
              </div>
            )}
          </div>

          <div className="section medications-section">
            <h2>💊 Available Medications ({medications.length})</h2>
            
            <input 
              type="text" 
              placeholder="ابحث باسم الدواء..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{textAlign: 'right'}}
            />

            {searchTerm && (
              <div style={{margin: '5px 0', fontSize: '0.9em', color: '#666'}}>
                {filteredMedications.length} medications found for "{searchTerm}"
              </div>
            )}

            <div className="custom-instruction-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={useCustomInstruction}
                  onChange={(e) => setUseCustomInstruction(e.target.checked)}
                />
                Use Custom Instruction
              </label>
              {useCustomInstruction && (
                <textarea 
                  placeholder="Enter custom instruction..." 
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  rows="3"
                />
              )}
            </div>

            <div className="medications-list">
              {filteredMedications.length === 0 && searchTerm ? (
                <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                  No medications found for "{searchTerm}"
                </div>
              ) : (
                filteredMedications.map((medication, index) => (
                  <div key={createUniqueKey(medication, index)} className="medication-item">
                    <div className="medication-info">
                      <strong>{medication.DrugName}</strong>
                      <p>{medication.Instruction}</p>
                      {medication.InternationalCode && (
                        <small>Barcode: {medication.InternationalCode}</small>
                      )}
                    </div>
                    <button 
                      onClick={() => addToBasket(medication)}
                      disabled={!patients}
                    >
                      Add to Basket
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="section basket-section">
            <h2>🛒 Medication Basket ({basket.length} items)</h2>
            
            {basket.length === 0 ? (
              <p className="empty-basket">Basket is empty</p>
            ) : (
              <div className="basket-list">
                {basket.map(item => (
                  <div key={item.TempID} className="basket-item">
                    <div className="basket-info">
                      <strong>{item.DrugName}</strong>
                      <p>{item.InstructionText}</p>
                      
                      <div className="expiry-input">
                        <label>Expiry Date:</label>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px'}}>
                          <select 
                            value={item.expiryMonth || ''}
                            onChange={(e) => handleExpiryMonthChange(item.TempID, e.target.value)}
                            style={{padding: '5px', minWidth: '100px'}}
                          >
                            <option value="">Select Month</option>
                            {months.map(month => (
                              <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                          </select>
                          
                          <select 
                            value={item.expiryYear || ''}
                            onChange={(e) => handleExpiryYearChange(item.TempID, e.target.value)}
                            style={{padding: '5px', minWidth: '80px'}}
                          >
                            <option value="">Select Year</option>
                            {years.map(year => (
                              <option key={year.value} value={year.value}>{year.label}</option>
                            ))}
                          </select>
                          
                          {item.expiryDate && (
                            <span style={{fontSize: '0.8em', color: 'green', fontWeight: 'bold'}}>
                              ✓ {item.expiryDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFromBasket(item.TempID)} className="remove-btn">❌</button>
                  </div>
                ))}
              </div>
            )}

            {basket.length > 0 && (
              <div className="basket-controls">
                <div className="form-group">
                  <label>Number of Labels per Medication:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <button onClick={clearBasket} className="clear-btn">Clear Basket</button>
              </div>
            )}
          </div>

          {patients && basket.length > 0 && (
            <div className="section print-section">
              <h2>🖨️ Print Labels</h2>
              
              <div className="print-controls">
                <button onClick={printLabels} className="print-btn">🖨️ Print All Labels</button>
                
                <div className="print-summary">
                  <p><strong>Print Summary:</strong></p>
                  <p>Patient: {patients.PatientName}</p>
                  <p>Total Labels: {basket.length * printQuantity}</p>
                  <p>Medications: {basket.length}</p>
                  <p style={{color: basket.some(item => !item.expiryDate) ? 'red' : 'green'}}>
                    Expiry Dates: {basket.filter(item => item.expiryDate).length}/{basket.length} set
                  </p>
                </div>
              </div>

              <div className="section audit-section" style={{marginTop: '20px', border: '1px solid #ddd', padding: '15px'}}>
                <h3>📊 Audit Logging</h3>
                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                  <button onClick={loadLocalAuditLogs} style={{backgroundColor: '#28a745'}}>📋 View Local Logs ({auditLogs.length})</button>
                  <button onClick={clearLocalAuditLogs} style={{backgroundColor: '#dc3545'}}>🗑️ Clear Local Logs</button>
                </div>
                
                {auditLogs.length > 0 && (
                  <div style={{marginTop: '10px', maxHeight: '200px', overflowY: 'auto'}}>
                    <h4>Recent Local Audit Logs:</h4>
                    {auditLogs.slice(-5).map((log, index) => (
                      <div key={log.id} style={{border: '1px solid #ccc', padding: '5px', margin: '2px', fontSize: '0.8em'}}>
                        <strong>{log.patientName}</strong> - {log.drugName} - {new Date(log.timestamp).toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;