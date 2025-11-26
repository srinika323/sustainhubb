const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React frontend app in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// Initialize SQLite database
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/fridge.db' : './fridge.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL,
      unit TEXT,
      expiry_date TEXT NOT NULL,
      added_date TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_date TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating ingredients table:', err);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT NOT NULL,
      created_date TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating recipes table:', err);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_name TEXT NOT NULL,
      quantity TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    )
  `, (err) => {
    if (err) console.error('Error creating recipe_ingredients table:', err);
    else seedRecipes();
  });
}

// Seed some initial recipes
function seedRecipes() {
  db.get('SELECT COUNT(*) as count FROM recipes', (err, row) => {
    if (err) {
      console.error('Error checking recipes:', err);
      return;
    }

    if (row.count === 0) {
      const recipes = [
        {
          name: 'Tomato Soup',
          description: 'A warm and comforting tomato soup',
          instructions: `1. Heat 2 tbsp olive oil or butter in a pot.
2. Add 2 garlic cloves (minced).
3. Add 4 cups chopped tomatoes.
4. Add 1 cup vegetable broth (or water).
5. Salt, pepper, and herbs to season.
6. Simmer 15-20 minutes.
7. Blend until smooth and garnish.`,
          ingredients: [
            { name: 'tomato', quantity: '4 cups chopped' },
            { name: 'garlic', quantity: '2 cloves minced' },
            { name: 'olive oil', quantity: '2 tbsp' },
            { name: 'vegetable broth', quantity: '1 cup' }
          ]
        },
        {
          name: 'Fruit Salad',
          description: 'A refreshing mix of fresh fruits',
          instructions: `1. Combine all fruits in a bowl.
2. Drizzle with honey/lemon.
3. Mix gently to coat.
4. Serve fresh or chilled.`,
          ingredients: [
            { name: 'grapes', quantity: '1 cup (halved)' },
            { name: 'apple', quantity: '1 large chopped' },
            { name: 'lemon juice', quantity: '1 tsp' },
            { name: 'honey', quantity: '1 tsp (optional)' }
          ]
        },
        {
          name: 'Caramel Apples',
          description: 'Sweet caramel-coated apples',
          instructions: `1. Insert popsicle sticks in apples.
2. Melt caramel (low heat, stir).
3. Dip apples into caramel.
4. Let set on parchment paper until firm.`,
          ingredients: [
            { name: 'apple', quantity: '4 apples' },
            { name: 'caramel', quantity: '1 cup soft caramels (store-bought)' },
            { name: 'popsicle sticks', quantity: '4 sticks' }
          ]
        },
        {
          name: 'Spaghetti',
          description: 'Classic pasta with tomato sauce',
          instructions: `1. Cook spaghetti as per packet instructions.
2. In a pan, sauté garlic in olive oil.
3. Add tomatoes, salt, pepper, and herbs. Simmer 10-15 mins.
4. Mix cooked spaghetti. Toss and serve hot.`,
          ingredients: [
            { name: 'spaghetti', quantity: '200g' },
            { name: 'tomato', quantity: '4 cups (400g) chopped' },
            { name: 'garlic', quantity: '2 cloves minced' },
            { name: 'olive oil', quantity: '2 tbsp' }
          ]
        }
      ];

      recipes.forEach(recipe => {
        db.run(
          'INSERT INTO recipes (name, description, instructions) VALUES (?, ?, ?)',
          [recipe.name, recipe.description, recipe.instructions],
          function(err) {
            if (err) {
              console.error('Error inserting recipe:', err);
              return;
            }

            const recipeId = this.lastID;
            recipe.ingredients.forEach(ingredient => {
              db.run(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity) VALUES (?, ?, ?)',
                [recipeId, ingredient.name, ingredient.quantity]
              );
            });
          }
        );
      });

      console.log('Seeded initial recipes');
    }
  });
}

// Helper function to calculate days until expiry
function getDaysUntilExpiry(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ============= API Routes =============

// ESP32 endpoint - Update/Add ingredients
app.post('/api/ingredients', (req, res) => {
  const { name, category, quantity, unit, expiry_date } = req.body;

  if (!name || !quantity || !expiry_date) {
    return res.status(400).json({ error: 'Name, quantity, and expiry_date are required' });
  }

  db.run(
    `INSERT INTO ingredients (name, category, quantity, unit, expiry_date)
     VALUES (?, ?, ?, ?, ?)`,
    [name, category || 'other', quantity, unit || 'units', expiry_date],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        name,
        category,
        quantity,
        unit,
        expiry_date
      });
    }
  );
});

// Get all ingredients
app.get('/api/ingredients', (req, res) => {
  db.all('SELECT * FROM ingredients ORDER BY expiry_date ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Update ingredient (ESP32 can use this to update quantities)
app.put('/api/ingredients/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit, expiry_date } = req.body;

  db.run(
    `UPDATE ingredients
     SET name = ?, category = ?, quantity = ?, unit = ?, expiry_date = ?, updated_date = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, category, quantity, unit, expiry_date, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }
      res.json({ message: 'Ingredient updated successfully' });
    }
  );
});

// Delete ingredient
app.delete('/api/ingredients/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM ingredients WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ message: 'Ingredient deleted successfully' });
  });
});

// Get all recipes
app.get('/api/recipes', (req, res) => {
  db.all('SELECT * FROM recipes', [], (err, recipes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const recipePromises = recipes.map(recipe => {
      return new Promise((resolve, reject) => {
        db.all(
          'SELECT ingredient_name, quantity FROM recipe_ingredients WHERE recipe_id = ?',
          [recipe.id],
          (err, ingredients) => {
            if (err) reject(err);
            else resolve({ ...recipe, ingredients });
          }
        );
      });
    });

    Promise.all(recipePromises)
      .then(recipesWithIngredients => res.json(recipesWithIngredients))
      .catch(err => res.status(500).json({ error: err.message }));
  });
});

// Get suggested recipes based on available ingredients - PRIORITIZING EXPIRING ITEMS
app.get('/api/recipes/suggestions', (req, res) => {
  // First, get all ingredients with their expiry dates
  db.all('SELECT name, expiry_date FROM ingredients', [], (err, availableIngredients) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Create a map of ingredient names to their expiry info
    const ingredientMap = {};
    availableIngredients.forEach(ingredient => {
      const ingredientName = ingredient.name.toLowerCase();
      const daysUntilExpiry = getDaysUntilExpiry(ingredient.expiry_date);
      
      // Store the shortest expiry time if ingredient appears multiple times
      if (!ingredientMap[ingredientName] || daysUntilExpiry < ingredientMap[ingredientName].daysUntilExpiry) {
        ingredientMap[ingredientName] = {
          name: ingredient.name,
          expiryDate: ingredient.expiry_date,
          daysUntilExpiry: daysUntilExpiry
        };
      }
    });

    const availableNames = Object.keys(ingredientMap);

    // Get all recipes
    db.all('SELECT * FROM recipes', [], (err, recipes) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const recipePromises = recipes.map(recipe => {
        return new Promise((resolve, reject) => {
          db.all(
            'SELECT ingredient_name, quantity FROM recipe_ingredients WHERE recipe_id = ?',
            [recipe.id],
            (err, ingredients) => {
              if (err) {
                reject(err);
                return;
              }

              const recipeIngredientNames = ingredients.map(i => i.ingredient_name.toLowerCase());
              
              // Calculate match statistics
              let matchCount = 0;
              let expiringIngredientsUsed = [];
              let totalExpiryScore = 0;
              
              recipeIngredientNames.forEach(name => {
                if (availableNames.includes(name)) {
                  matchCount++;
                  const ingredientInfo = ingredientMap[name];
                  
                  // Calculate expiry urgency score (lower days = higher priority)
                  // Items expiring in 0-2 days get highest score
                  let expiryScore = 0;
                  if (ingredientInfo.daysUntilExpiry <= 0) {
                    expiryScore = 100; // Expired or expiring today
                  } else if (ingredientInfo.daysUntilExpiry <= 2) {
                    expiryScore = 90; // Expiring very soon
                  } else if (ingredientInfo.daysUntilExpiry <= 5) {
                    expiryScore = 70; // Expiring soon
                  } else if (ingredientInfo.daysUntilExpiry <= 7) {
                    expiryScore = 50; // Expiring this week
                  } else {
                    expiryScore = 20; // Not urgent
                  }
                  
                  totalExpiryScore += expiryScore;
                  
                  if (ingredientInfo.daysUntilExpiry <= 7) {
                    expiringIngredientsUsed.push({
                      name: ingredientInfo.name,
                      daysUntilExpiry: ingredientInfo.daysUntilExpiry,
                      expiryDate: ingredientInfo.expiryDate
                    });
                  }
                }
              });

              const matchPercentage = (matchCount / recipeIngredientNames.length) * 100;
              
              // Calculate priority score (combining match % and expiry urgency)
              // Recipes with expiring ingredients get boosted priority
              const avgExpiryScore = matchCount > 0 ? totalExpiryScore / matchCount : 0;
              const priorityScore = (matchPercentage * 0.6) + (avgExpiryScore * 0.4);

              resolve({
                ...recipe,
                ingredients,
                matchPercentage,
                matchCount,
                totalIngredients: recipeIngredientNames.length,
                expiringIngredientsUsed,
                priorityScore,
                avgExpiryScore
              });
            }
          );
        });
      });

      Promise.all(recipePromises)
        .then(recipesWithMatches => {
          const suggestedRecipes = recipesWithMatches
            .filter(r => r.matchPercentage >= 50) // Must have at least 50% ingredients available
            .sort((a, b) => {
              // First sort by priority score (considers both match % and expiry urgency)
              if (Math.abs(b.priorityScore - a.priorityScore) > 5) {
                return b.priorityScore - a.priorityScore;
              }
              // If priority scores are similar, prefer recipes with more expiring ingredients
              return b.expiringIngredientsUsed.length - a.expiringIngredientsUsed.length;
            });
          
          res.json(suggestedRecipes);
        })
        .catch(err => res.status(500).json({ error: err.message }));
    });
  });
});

// Get recipe by ID
app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, recipe) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    db.all(
      'SELECT ingredient_name, quantity FROM recipe_ingredients WHERE recipe_id = ?',
      [id],
      (err, ingredients) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ ...recipe, ingredients });
      }
    );
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fridge API is running' });
});

// Catch-all handler: serve React app for any route not matched above
// This must be placed AFTER all API routes
if (NODE_ENV === 'production') {
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  if (NODE_ENV === 'production') {
    console.log('Serving frontend from backend');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
