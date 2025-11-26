import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MealIdeas.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function MealIdeas() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recipesResponse, ingredientsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/recipes/suggestions`),
        axios.get(`${API_URL}/api/ingredients`)
      ]);

      setRecipes(recipesResponse.data);
      setAvailableIngredients(ingredientsResponse.data.map(i => i.name.toLowerCase()));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const getIngredientStatus = (recipe) => {
    const have = [];
    const need = [];

    recipe.ingredients.forEach(ingredient => {
      const ingredientName = ingredient.ingredient_name.toLowerCase();
      if (availableIngredients.includes(ingredientName)) {
        have.push(ingredient);
      } else {
        need.push(ingredient);
      }
    });

    return { have, need };
  };

  const getDaysText = (days) => {
    if (days <= 0) return 'Expired/Today!';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const getExpiryClass = (days) => {
    if (days <= 0) return 'expiry-urgent';
    if (days <= 2) return 'expiry-very-soon';
    if (days <= 5) return 'expiry-soon';
    if (days <= 7) return 'expiry-this-week';
    return '';
  };

  const toggleExpanded = (recipeId, e) => {
    e.stopPropagation();
    setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId);
  };

  return (
    <div className="meal-ideas-page">
      <div className="page-header">
        <h1 className="page-title">MEAL IDEAS</h1>
        <p className="subtitle">Recipes prioritized by expiring ingredients</p>
      </div>

      <div className="meal-ideas-content">
        {loading ? (
          <p>Loading meal ideas...</p>
        ) : recipes.length === 0 ? (
          <p className="empty-message">Add some ingredients to get meal suggestions!</p>
        ) : (
          <div className="recipe-cards">
            {recipes.map((recipe) => {
              const { have, need } = getIngredientStatus(recipe);
              const isExpanded = expandedRecipe === recipe.id;
              const hasExpiringIngredients = recipe.expiringIngredientsUsed && recipe.expiringIngredientsUsed.length > 0;

              return (
                <div key={recipe.id} className="recipe-card">
                  <div className="recipe-card-header">
                    <div className="recipe-info" onClick={() => navigate(`/recipe/${recipe.id}`)}>
                      <span className="recipe-name">{recipe.name}</span>
                      <div className="recipe-badges">
                        {recipe.matchPercentage && (
                          <span className="match-badge">{Math.round(recipe.matchPercentage)}%</span>
                        )}
                        {hasExpiringIngredients && (
                          <span className="expiring-badge">⚠️ Use soon!</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="expand-button"
                      onClick={(e) => toggleExpanded(recipe.id, e)}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="recipe-card-details">
                      {hasExpiringIngredients && (
                        <div className="expiring-ingredients-section">
                          <h3 className="ingredients-header expiring">
                            ⏰ Expiring Soon:
                          </h3>
                          <ul className="ingredients-list expiring">
                            {recipe.expiringIngredientsUsed.map((ing, idx) => (
                              <li 
                                key={idx} 
                                className={`ingredient-item expiring ${getExpiryClass(ing.daysUntilExpiry)}`}
                              >
                                <span className="ingredient-name">{ing.name}</span>
                                <span className="expiry-info">
                                  ({getDaysText(ing.daysUntilExpiry)})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {have.length > 0 && (
                        <div className="ingredients-section">
                          <h3 className="ingredients-header have">✓ You have ({have.length}):</h3>
                          <ul className="ingredients-list">
                            {have.map((ing, idx) => (
                              <li key={idx} className="ingredient-item have">
                                {ing.quantity && `${ing.quantity} `}
                                {ing.ingredient_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {need.length > 0 && (
                        <div className="ingredients-section">
                          <h3 className="ingredients-header need">✗ You need ({need.length}):</h3>
                          <ul className="ingredients-list">
                            {need.map((ing, idx) => (
                              <li key={idx} className="ingredient-item need">
                                {ing.quantity && `${ing.quantity} `}
                                {ing.ingredient_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        className="view-recipe-button"
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                      >
                        View Full Recipe
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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

export default MealIdeas;
