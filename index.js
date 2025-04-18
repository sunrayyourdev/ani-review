const express = require('express');
const Joi = require('joi');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 8080;

app.use(express.json());

// Connect to database or create one if it does not exist
const db = new sqlite3.Database('./reviews.db', (err) => {
    if (err) {
        console.error("Failed to connect to database:", err);
    } else {
        console.log("Connected to SQLite database.");
    }
});

// Create tables if they do not exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime VARCHAR(200) NOT NULL,
        rating INTEGER NOT NULL,
        content VARCHAR(200) NOT NULL
    )`)
});

const reviewSchema = Joi.object({
    anime: Joi.string().min(1).required(),
    rating: Joi.number().integer().min(0).max(10).required(),
    content: Joi.string().min(1).required(),
})

// Review endpoints

app.get('/reviews', (req, res) => {
    db.all('SELECT * FROM reviews', (err, rows) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        res.send(rows);
    });
});

app.post('/reviews', (req, res) => {
    const review = req.body;

    const { error } = reviewSchema.validate(review)
    if (error) {
        return res.status(400).send({ error: error.details[0].message });
    }

    const sql = `INSERT INTO reviews (anime, rating, content) VALUES (?, ?, ?)`;
    const params = [review.anime, Number(review.rating), review.content];
    db.run(sql, params, (err) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        db.all('SELECT * FROM reviews ORDER BY id DESC LIMIT 1', (err, rows) => {
            if (err) {
                return res.status(500).send({ error: err.message });
            }
            res.send(rows[0]);
        });
    });
});

app.get('/reviews/:id', (req, res) => {
    const { id } = req.params;
    
    db.all('SELECT * FROM reviews WHERE id=?', [id], (err, rows) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).send({ error: "Review not found" });
        }
        res.send(rows[0]);
    });
});

app.put('/reviews/:id', (req, res) => {
    const { id } = req.params;
    const review = req.body;

    const { error } = reviewSchema.validate(review)
    if (error) {
        return res.status(400).send({ error: error.details[0].message });
    }
    
    db.all('SELECT * FROM reviews WHERE id=?', [id], (err, rows) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).send({ error: "Review not found" });
        }
        const sql = `UPDATE reviews SET anime=?, rating=?, content=? WHERE id=?`;
        const params = [review.anime, Number(review.rating), review.content, id];
        db.run(sql, params, (err) => {
            if (err) {
                return res.status(500).send({ error: err.message });
            }
            
            db.all('SELECT * FROM reviews WHERE id=?', [id], (err, rows) => {
                if (err) {
                    return res.status(500).send({ error: err.message });
                }
                res.send(rows[0]);
            });
        });
    });
});

app.delete('/reviews/:id', (req, res) => {
    const { id } = req.params;

    db.all('SELECT * FROM reviews WHERE id=?', [id], (err, rows) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).send({ error: "Review not found" });
        }
        db.run('DELETE FROM reviews WHERE id=?', [id], (err) => {
            if (err) {
                return res.status(500).send({ error: err.message });
            }
            res.status(200).send({ message: "Review deleted successfully" });
        });
    });
});

app.listen(
    PORT,
    () => console.log(`it's alive on http://localhost:${PORT}`)
)