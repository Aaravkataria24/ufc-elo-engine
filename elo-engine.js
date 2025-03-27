import fs from 'fs-extra';
import { parse } from 'json2csv';

const INITIAL_ELO = 1000;
const BASE_K_FACTOR = 40;
const FINISH_MULTIPLIER = 1.5;

const eloRatings = {};
const peakEloRatings = {};
const matchHistories = {};

// Expected score function for Elo calculation
function expectedScore(eloA, eloB) {
    return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

// Determine K-factor based on experience (fewer matches = higher K)
function getKFactor(fighter, isFinish) {
    let fights = matchHistories[fighter]?.length || 0;
    let kFactor = fights < 10 ? BASE_K_FACTOR * 1.5 : BASE_K_FACTOR;
    return isFinish ? kFactor * FINISH_MULTIPLIER : kFactor;
}

// Elo update logic
function updateElo(winner, loser, isFinish) {
    // Initialize fighter data if not exists
    if (!eloRatings[winner]) {
        eloRatings[winner] = { elo: INITIAL_ELO };
        peakEloRatings[winner] = INITIAL_ELO;
        matchHistories[winner] = [];
    }
    if (!eloRatings[loser]) {
        eloRatings[loser] = { elo: INITIAL_ELO };
        peakEloRatings[loser] = INITIAL_ELO;
        matchHistories[loser] = [];
    }

    const winnerElo = eloRatings[winner].elo;
    const loserElo = eloRatings[loser].elo;

    const expectedWin = expectedScore(winnerElo, loserElo);
    const kFactor = getKFactor(winner, isFinish);

    const newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedWin));
    const newLoserElo = Math.round(loserElo + kFactor * (0 - (1 - expectedWin)));

    // Update Elo ratings
    eloRatings[winner].elo = newWinnerElo;
    eloRatings[loser].elo = newLoserElo;

    // Update peak Elo
    peakEloRatings[winner] = Math.max(peakEloRatings[winner], newWinnerElo);
    peakEloRatings[loser] = Math.max(peakEloRatings[loser], newLoserElo);

    // Track match histories
    matchHistories[winner].push({ opponent: loser, result: 'win', elo: newWinnerElo });
    matchHistories[loser].push({ opponent: winner, result: 'loss', elo: newLoserElo });
}

// Function to process fights and update Elo rankings
function processFights(allFights) {
    // First, sort fights chronologically to ensure correct Elo progression
    const sortedFights = allFights.sort((a, b) => {
        // Assuming you might want to add a date field to your fight data
        // If no date, this will maintain original order
        return new Date(a.date || 0) - new Date(b.date || 0);
    });

    sortedFights.forEach((fight) => {
        let { fighter_1, fighter_2, result, method } = fight;

        // Normalize method and result handling
        const normalizedMethod = method.toLowerCase();
        const isFinish = 
            normalizedMethod.includes('ko') || 
            normalizedMethod.includes('tko') || 
            normalizedMethod.includes('sub');

        // Determine winner and loser
        if (result.toLowerCase() === 'win') {
            updateElo(fighter_1, fighter_2, isFinish);
        } else if (result.toLowerCase() === 'loss') {
            updateElo(fighter_2, fighter_1, isFinish);
        } else if (result.toLowerCase() === 'draw') {
            // Handle draws with smaller Elo adjustments
            const kFactor = BASE_K_FACTOR / 2;
            const winnerElo = eloRatings[fighter_1].elo;
            const loserElo = eloRatings[fighter_2].elo;
            const expectedWin = expectedScore(winnerElo, loserElo);

            eloRatings[fighter_1].elo = Math.round(winnerElo + kFactor * (0.5 - expectedWin));
            eloRatings[fighter_2].elo = Math.round(loserElo + kFactor * (0.5 - (1 - expectedWin)));
        }
    });
}

// Save Elo ratings to CSV
function saveToCSV() {
    const fighterData = Object.keys(eloRatings)
        .map(fighter => ({
            Fighter: fighter,
            Elo: eloRatings[fighter].elo,
            PeakElo: peakEloRatings[fighter],
            Matches: matchHistories[fighter].length
        }))
        .sort((a, b) => b.Elo - a.Elo); // Sort in descending order of Elo 

    const csv = parse(fighterData, { fields: ["Fighter", "Elo", "PeakElo", "Matches"] });
    fs.writeFileSync("fighter_elo.csv", csv);
    console.log("Elo rankings saved to fighter_elo.csv");
}

// Main execution
try {
    const allFights = fs.readJsonSync('fights.json'); // Load fights.json
    console.log(`Loaded ${allFights.length} fights from fights.json`);

    processFights(allFights);
    saveToCSV();
} catch (error) {
    console.error("Error loading fights.json:", error);
}