import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ScanReceipt.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function ScanReceipt() {
  const navigate = useNavigate();
  const [receiptImage, setReceiptImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedItems, setExtractedItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setMessage('');
    }
  };

  const handleCameraCapture = (e) => {
    handleImageUpload(e);
  };

  const extractWithOpenRouter = async () => {
    setProcessing(true);
    setMessage('Processing receipt with AI...');

    try {
      // Convert image to base64 if not already
      const base64Image = imagePreview;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'anthropic/claude-3.5-sonnet', // or 'openai/gpt-4-vision-preview'
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this shopping receipt and extract all food items. For each item, provide:
- name (lowercase, singular form)
- quantity (as a number)
- unit (e.g., pieces, bottles, kg, etc.)
- estimated days until expiry (reasonable estimate based on item type)

Return ONLY a valid JSON array in this exact format:
[{"name": "tomato", "quantity": 3, "unit": "pieces", "expiry_days": 5}]

Do not include any other text or explanation.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'SustainHub Fridge Manager',
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // Parse the JSON response
      let items;
      try {
        // Try to extract JSON from the response (in case AI adds extra text)
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        items = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
      } catch (parseError) {
        console.error('Error parsing AI response:', aiResponse);
        throw new Error('Could not parse items from receipt');
      }

      setExtractedItems(items);
      setProcessing(false);
      setMessage(`Extracted ${items.length} items! Review and add to inventory.`);
    } catch (error) {
      console.error('Error extracting items with OpenRouter:', error);
      setMessage('Error processing receipt. Please try again or use manual entry.');
      setProcessing(false);
    }
  };

  const simulateOCR = () => {
    // Simulated OCR extraction for testing without API key
    setProcessing(true);
    setMessage('Processing receipt (demo mode)...');

    setTimeout(() => {
      const mockItems = [
        { name: 'tomato', quantity: 3, unit: 'pieces', expiry_days: 5 },
        { name: 'apple', quantity: 6, unit: 'pieces', expiry_days: 7 },
        { name: 'milk', quantity: 1, unit: 'bottle', expiry_days: 5 },
        { name: 'bread', quantity: 1, unit: 'loaf', expiry_days: 3 },
      ];

      setExtractedItems(mockItems);
      setProcessing(false);
      setMessage('Items extracted! Review and add to inventory.');
    }, 2000);
  };

  const handleAddItem = (item, index) => {
    const updatedItems = [...extractedItems];
    updatedItems[index] = { ...item, selected: !item.selected };
    setExtractedItems(updatedItems);
  };

  const handleQuantityChange = (index, quantity) => {
    const updatedItems = [...extractedItems];
    updatedItems[index].quantity = parseInt(quantity) || 1;
    setExtractedItems(updatedItems);
  };

  const handleExpiryChange = (index, days) => {
    const updatedItems = [...extractedItems];
    updatedItems[index].expiry_days = parseInt(days) || 3;
    setExtractedItems(updatedItems);
  };

  const getExpiryDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  const handleAddToInventory = async () => {
    const selectedItems = extractedItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      setMessage('Please select at least one item to add.');
      return;
    }

    setProcessing(true);
    setMessage('Adding items to inventory...');

    try {
      for (const item of selectedItems) {
        await axios.post(`${API_URL}/api/ingredients`, {
          name: item.name,
          category: 'grocery',
          quantity: item.quantity,
          unit: item.unit,
          expiry_date: getExpiryDate(item.expiry_days)
        });
      }

      setMessage(`Successfully added ${selectedItems.length} items to inventory!`);
      setTimeout(() => {
        navigate('/inventory');
      }, 1500);
    } catch (error) {
      console.error('Error adding items:', error);
      setMessage('Error adding items to inventory. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="scan-receipt-page">
      <div className="page-header">
        <h1 className="page-title">SCAN RECEIPT</h1>
      </div>

      <div className="scan-content">
        {!imagePreview ? (
          <div className="upload-section">
            <p className="instruction-text">Upload or capture a receipt image</p>

            <div className="upload-buttons">
              <label className="upload-button" htmlFor="file-upload">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                </svg>
                Upload Image
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />

              <label className="upload-button camera-button" htmlFor="camera-capture">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/>
                </svg>
                Take Photo
              </label>
              <input
                id="camera-capture"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                style={{ display: 'none' }}
              />
            </div>

            <div className="info-box">
              <p><strong>Extraction Methods:</strong></p>
              <ul>
                <li><strong>AI Mode:</strong> Uses OpenRouter with Claude 3.5 Sonnet (requires API key)</li>
                <li><strong>Demo Mode:</strong> Simulates extraction with mock data (for testing)</li>
              </ul>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Set <code>VITE_OPENROUTER_API_KEY</code> in frontend/.env to use AI mode
              </p>
            </div>
          </div>
        ) : (
          <div className="preview-section">
            <div className="image-preview">
              <img src={imagePreview} alt="Receipt" />
            </div>

            {!extractedItems.length ? (
              <div className="action-buttons">
                <button
                  className="process-button ai-button"
                  onClick={extractWithOpenRouter}
                  disabled={processing || !import.meta.env.VITE_OPENROUTER_API_KEY}
                  title={!import.meta.env.VITE_OPENROUTER_API_KEY ? 'Set VITE_OPENROUTER_API_KEY in .env to enable' : ''}
                >
                  {processing ? 'Processing...' : '🤖 Extract with AI'}
                </button>
                <button className="process-button demo-button" onClick={simulateOCR} disabled={processing}>
                  {processing ? 'Processing...' : '🎭 Demo Mode (Mock Data)'}
                </button>
                <button className="reset-button" onClick={() => {
                  setReceiptImage(null);
                  setImagePreview(null);
                  setExtractedItems([]);
                  setMessage('');
                }}>
                  Upload Different Image
                </button>
              </div>
            ) : (
              <div className="extracted-items-section">
                <h2>Extracted Items:</h2>
                <p className="helper-text">Select items to add and adjust details:</p>

                <div className="items-list">
                  {extractedItems.map((item, index) => (
                    <div key={index} className={`item-card ${item.selected ? 'selected' : ''}`}>
                      <label className="item-checkbox">
                        <input
                          type="checkbox"
                          checked={item.selected || false}
                          onChange={() => handleAddItem(item, index)}
                        />
                        <span className="item-name">{item.name}</span>
                      </label>

                      <div className="item-details">
                        <div className="detail-group">
                          <label>Qty:</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            min="1"
                          />
                        </div>

                        <div className="detail-group">
                          <label>Expires in:</label>
                          <input
                            type="number"
                            value={item.expiry_days}
                            onChange={(e) => handleExpiryChange(index, e.target.value)}
                            min="1"
                          />
                          <span>days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="add-to-inventory-button"
                  onClick={handleAddToInventory}
                  disabled={processing}
                >
                  {processing ? 'Adding...' : 'Add Selected to Inventory'}
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="navigation-bar">
        <button className="nav-button home" onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </button>
        <button className="nav-button back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ScanReceipt;
