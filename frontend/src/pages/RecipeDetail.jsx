import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './RecipeDetail.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function RecipeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [recipeResponse, ingredientsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/recipes/${id}`),
        axios.get(`${API_URL}/api/ingredients`)
      ]);

      setRecipe(recipeResponse.data);
      setAvailableIngredients(ingredientsResponse.data.map(i => i.name.toLowerCase()));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const hasIngredient = (ingredientName) => {
    return availableIngredients.includes(ingredientName.toLowerCase());
  };

  return (
    <div className="recipe-detail-page">
      <div className="page-header">
        <h1 className="recipe-title">{recipe?.name || 'Loading...'}</h1>
      </div>

      <div className="recipe-content">
        {loading ? (
          <p>Loading recipe...</p>
        ) : recipe ? (
          <>
            <div className="recipe-section">
              <h2>Ingredients:</h2>
              <ul className="ingredients-list">
                {recipe.ingredients && recipe.ingredients.map((ingredient, index) => {
                  const have = hasIngredient(ingredient.ingredient_name);
                  return (
                    <li
                      key={index}
                      className={`ingredient-item ${have ? 'have' : 'need'}`}
                    >
                      <span className="ingredient-text">
                        {ingredient.quantity && `${ingredient.quantity} `}
                        {ingredient.ingredient_name}
                      </span>
                      {have ? (
                        <span className="ingredient-status have-status">✓ Have</span>
                      ) : (
                        <span className="ingredient-status need-status">✗ Need</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="recipe-section">
              <h2>Instructions:</h2>
              <div className="instructions">
                {recipe.instructions.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="error-message">Recipe not found</p>
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

export default RecipeDetail;
