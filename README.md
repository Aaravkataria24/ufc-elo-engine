UFC Elo Engine
A JavaScript-based Elo ranking system for UFC fighters, designed to semi-automatically rank fighters based on fight outcomes. Can also be done by peak elo.

Setup & Usage
Clone the Repository
```
git clone https://github.com/Aaravkataria24/ufc-elo-engine.git
cd ufc-elo-engine
```
Install Dependencies
```
pip install -r requirements.txt
```
Run the Elo Update Script
```
python update_elo.py
```

File Structure
```
/ufc-elo-engine
│── fighter_elo.csv         # Stores current Elo ratings
│── fights.json             # Input fight data
│── elo-engine.js           # Elo calculation script
│── scraper.js              # UFC website scraper script
│── README.md               # Project documentation
│── requirements.txt        # Dependencies
```

Contributing
1. Fork the repository
2. Create a new branch: git checkout -b feature-branch
3. Commit changes: git commit -m "Your message"
4. Push to GitHub: git push origin feature-branch
5. Open a Pull Request
