import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Inventory.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Inventory() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ingredients`);
      setIngredients(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      setLoading(false);
    }
  };

  const calculateDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  const addRandomIngredient = async () => {
    const randomIngredients = [
      'tomato', 'carrot', 'onion', 'garlic', 'potato', 'broccoli',
      'lettuce', 'cucumber', 'bell pepper', 'mushroom', 'spinach',
      'apple', 'banana', 'orange', 'grapes', 'strawberry',
      'chicken breast', 'ground beef', 'salmon', 'eggs', 'milk',
      'cheese', 'butter', 'yogurt', 'bread', 'rice', 'pasta'
    ];

    const categories = ['vegetable', 'fruit', 'protein', 'dairy', 'grain'];
    const units = ['units', 'kg', 'g', 'lbs', 'pieces'];

    const randomName = randomIngredients[Math.floor(Math.random() * randomIngredients.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomQuantity = Math.floor(Math.random() * 10) + 1;
    const randomUnit = units[Math.floor(Math.random() * units.length)];

    // Random expiry date between 1 and 14 days from now
    const daysToAdd = Math.floor(Math.random() * 14) + 1;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysToAdd);
    const formattedExpiry = expiryDate.toISOString().split('T')[0];

    try {
      await axios.post(`${API_URL}/api/ingredients`, {
        name: randomName,
        category: randomCategory,
        quantity: randomQuantity,
        unit: randomUnit,
        expiry_date: formattedExpiry
      });
      fetchIngredients(); // Refresh the list
    } catch (error) {
      console.error('Error adding random ingredient:', error);
      alert('Failed to add random ingredient');
    }
  };

  const deleteRandomIngredient = async () => {
    if (ingredients.length === 0) {
      alert('No ingredients to delete!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * ingredients.length);
    const randomIngredient = ingredients[randomIndex];

    try {
      await axios.delete(`${API_URL}/api/ingredients/${randomIngredient.id}`);
      fetchIngredients(); // Refresh the list
    } catch (error) {
      console.error('Error deleting random ingredient:', error);
      alert('Failed to delete random ingredient');
    }
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1 className="page-title">INVENTORY</h1>
      </div>

      <div className="testing-controls">
        <button className="test-button add-button" onClick={addRandomIngredient}>
          Add Random Ingredient
        </button>
        <button className="test-button delete-button" onClick={deleteRandomIngredient}>
          Delete Random Ingredient
        </button>
      </div>

      <div className="inventory-content">
        {loading ? (
          <p>Loading ingredients...</p>
        ) : ingredients.length === 0 ? (
          <p className="empty-message">No ingredients in your fridge yet!</p>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Vegetable/Item</th>
                <th>No.</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => (
                <tr key={ingredient.id}>
                  <td>{ingredient.name}</td>
                  <td>{ingredient.quantity}</td>
                  <td className={calculateDaysUntilExpiry(ingredient.expiry_date) === 'expired' ? 'expired' : ''}>
                    {calculateDaysUntilExpiry(ingredient.expiry_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default Inventory;
