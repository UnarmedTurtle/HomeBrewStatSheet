// File: app.js (COMPLETE - Multi-Character, Prestige/Soul Calcs, Admin Panel)
// Last updated: Saturday, April 19, 2025 at 2:33 PM EDT (Midland, MI)
// !! WARNING: Uses insecure Firestore document check for admin status. Use Custom Claims in production. !!
// !! WARNING: Ensure Firestore rules are configured correctly for multi-character model. !!

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAbYQWbMQBHOdT-PxwIXeDFvLgEXlX7PhY", // SENSITIVE
    authDomain: "dndfortheboys-d88d9.firebaseapp.com",
    databaseURL: "https://dndfortheboys-d88d9-default-rtdb.firebaseio.com",
    projectId: "dndfortheboys-d88d9",
    storageBucket: "dndfortheboys-d88d9.appspot.com",
    messagingSenderId: "721075269380",
    appId: "1:721075269380:web:57017695c5f969a63faa51",
    measurementId: "G-T27J01JQF8"
};

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// --- DOM Elements ---
// General UI
const loadingEl = document.getElementById('loading');
const authContainerEl = document.getElementById('auth-container');
const googleSignInButton = document.getElementById('google-signin-button');
const authErrorEl = document.getElementById('auth-error');
// Character Selection Screen
const characterSelectionScreenEl = document.getElementById('character-selection-screen');
const characterListEl = document.getElementById('character-list');
const showCreationFormButton = document.getElementById('show-creation-form-button');
const selectionLogoutButton = document.getElementById('selection-logout-button'); // Logout from selection
const selectionErrorEl = document.getElementById('selection-error');
// Main Content Area
const mainContentEl = document.getElementById('main-content');
const userEmailEl = document.getElementById('user-email');
const switchCharacterButton = document.getElementById('switch-character-button'); // Go back to selection
const mainLogoutButton = document.getElementById('main-logout-button'); // Logout from main view
// Character Creation Inputs
const characterCreationEl = document.getElementById('character-creation');
const saveCharacterButton = document.getElementById('save-character');
const createErrorEl = document.getElementById('create-error');
const charNameInput = document.getElementById('char-name');
const statStrInput = document.getElementById('stat-str');
const statDexInput = document.getElementById('stat-dex');
const statConInput = document.getElementById('stat-con');
const statIntInput = document.getElementById('stat-int');
const statWisInput = document.getElementById('stat-wis');
const statChaInput = document.getElementById('stat-cha');
const statVigorInput = document.getElementById('stat-vigor');
const statAgilityInput = document.getElementById('stat-agility');
const statMindInput = document.getElementById('stat-mind');
const statSpiritInput = document.getElementById('stat-spirit');
const statSoulLevelInput = document.getElementById('stat-soul-level');
const statPrestigeLevelInput = document.getElementById('stat-prestige-level');
const dnaSelectionOptionsEl = document.getElementById('dna-selection-options');
// Character Display Elements
const characterDisplayEl = document.getElementById('character-display');
const displayCharNameEl = document.getElementById('display-char-name');
const displayAc = document.getElementById('display-ac');
const displayMaxHp = document.getElementById('display-max-hp');
const displaySpeed = document.getElementById('display-speed');
const displayLevelEl = document.getElementById('display-level');
const displayExpEl = document.getElementById('display-exp');
const displayExpNeededEl = document.getElementById('display-exp-needed');
const displayStatStr = document.getElementById('display-stat-str');
const displayStatDex = document.getElementById('display-stat-dex');
const displayStatCon = document.getElementById('display-stat-con');
const displayStatInt = document.getElementById('display-stat-int');
const displayStatWis = document.getElementById('display-stat-wis');
const displayStatCha = document.getElementById('display-stat-cha');
const displayStatVigor = document.getElementById('display-stat-vigor');
const displayStatAgility = document.getElementById('display-stat-agility');
const displayStatMind = document.getElementById('display-stat-mind');
const displayStatSpirit = document.getElementById('display-stat-spirit');
const displaySoulLevel = document.getElementById('display-soul-level');
const displaySoulHp = document.getElementById('display-soul-hp');
const displaySoulPower = document.getElementById('display-soul-power');
const displaySaveStr = document.getElementById('display-save-str');
const displaySaveDex = document.getElementById('display-save-dex');
const displaySaveCon = document.getElementById('display-save-con');
const displaySaveInt = document.getElementById('display-save-int');
const displaySaveWis = document.getElementById('display-save-wis');
const displaySaveCha = document.getElementById('display-save-cha');
const displaySkillsContainer = document.getElementById('display-skills'); // Container div
const displayDnasEl = document.getElementById('display-dnas');
// Admin Panel Elements
const openAdminPanelButton = document.getElementById('open-admin-panel-button');
const adminPanelModal = document.getElementById('admin-panel-modal');
const closeAdminPanelButton = document.getElementById('close-admin-panel-button');
const adminAddDnaForm = document.getElementById('admin-add-dna-form');
const adminDnaNameInput = document.getElementById('admin-dna-name');
const adminDnaDescriptionInput = document.getElementById('admin-dna-description');
const adminAddDnaErrorEl = document.getElementById('admin-add-dna-error');
const adminDnaListLoadingEl = document.getElementById('admin-dna-list-loading');
const adminDnaTable = document.getElementById('admin-dna-table');
const adminDnaTableBody = document.getElementById('admin-dna-table-body');
const adminDnaListErrorEl = document.getElementById('admin-dna-list-error');

// --- References ---
const dnasCollectionRef = db.collection('dnas');
const charactersCollectionRef = db.collection('characters'); // Reference characters collection
const usersCollectionRef = db.collection('users'); // Reference users collection

// --- Global State ---
let currentUser = null;
let currentUserProfile = null; // Store the user's profile data (including isAdmin flag)
let currentCharacterId = null; // ID of the currently loaded character
let characterData = null; // Data object of the loaded character
let availableDnas = [];
let characterDocListener = null; // Firestore listener for the *currently selected* character

// --- List of Skills (for easier iteration) ---
const skills = [ "acrobatics", "animalhandling", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleightofhand", "stealth", "survival" ];


// --- Authentication Logic ---
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed. User:", user ? user.uid : 'null');
    resetUIState(); // Reset UI before proceeding

    if (user) {
        currentUser = user;
        userEmailEl.textContent = user.email; // Used in main content header

        try {
            // Fetch user profile first, this includes the isAdmin flag
            currentUserProfile = await getUserProfile(user.uid, user.email);
            checkAdminStatusFirestore(currentUserProfile); // Show/hide admin button based on profile

            // Show Character Selection Screen
            characterSelectionScreenEl.classList.remove('hidden');
            loadUserCharacters(user.uid); // Load the list of characters

        } catch (error) {
            console.error("Error during post-login setup:", error);
            selectionErrorEl.textContent = "Error loading user profile."; // Show error on selection screen
            characterSelectionScreenEl.classList.remove('hidden'); // Still show selection screen, but with error
            authContainerEl.classList.add('hidden');
        }

    } else {
        // User is signed out.
        currentUser = null;
        currentUserProfile = null;
        authContainerEl.classList.remove('hidden'); // Show login options
    }
});

// Google Sign-In Listener
if (googleSignInButton) {
    googleSignInButton.addEventListener('click', () => {
        authErrorEl.textContent = '';
        auth.signInWithPopup(provider).catch((error) => {
            console.error("Google Sign-In Error:", error.code, error.message);
            let friendlyMessage = `Google Sign-In failed: ${error.message}`;
            if (error.code === 'auth/popup-closed-by-user') { friendlyMessage = "Sign-in cancelled."; }
            authErrorEl.textContent = friendlyMessage;
        });
    });
} else { console.error("Google Sign-In button not found!"); }

// --- Logout Function (used by both buttons) ---
function handleLogout() {
    if (characterDocListener) { // Detach listener before logout
        console.log("Detaching character listener before logout.");
        characterDocListener();
    }
    characterDocListener = null; // Clear listener variable
    auth.signOut().catch(error => console.error("Logout failed:", error));
}
if (mainLogoutButton) mainLogoutButton.addEventListener('click', handleLogout);
if (selectionLogoutButton) selectionLogoutButton.addEventListener('click', handleLogout);


// --- UI State Management ---
function resetUIState() {
    // Hide all main sections initially
    loadingEl.classList.add('hidden');
    authContainerEl.classList.add('hidden');
    characterSelectionScreenEl.classList.add('hidden');
    mainContentEl.classList.add('hidden');
    characterCreationEl.classList.add('hidden');
    characterDisplayEl.classList.add('hidden');
    adminPanelModal.classList.add('hidden');
    if(openAdminPanelButton) openAdminPanelButton.classList.add('hidden'); // Hide admin button until checked

    // Reset potentially selected character
    currentCharacterId = null;
    characterData = null;

    // Clear error messages
    authErrorEl.textContent = '';
    selectionErrorEl.textContent = '';
    createErrorEl.textContent = '';

    // Detach listener if active
    if (characterDocListener) {
        console.log("Detaching character listener during UI reset.");
        characterDocListener();
        characterDocListener = null;
    }
}


// --- Character Selection Logic ---

/** Fetches and displays the list of characters for the current user */
async function loadUserCharacters(userId) {
    if (!userId) { console.error("loadUserCharacters: userId is missing"); return; }
    characterListEl.innerHTML = '<p class="text-gray-500 italic text-center py-4">Loading characters...</p>';
    selectionErrorEl.textContent = '';

    try {
        const querySnapshot = await charactersCollectionRef.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
        characterListEl.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            characterListEl.innerHTML = '<p class="text-gray-500 italic text-center py-4">No characters found. Create one below!</p>';
        } else {
            querySnapshot.forEach(doc => {
                const char = doc.data();
                const button = document.createElement('button');
                button.textContent = char.name || 'Unnamed Character';
                button.classList.add('character-list-item'); // Add class for styling
                button.dataset.charId = doc.id; // Store character ID on the button
                button.addEventListener('click', () => handleCharacterSelect(doc.id));
                characterListEl.appendChild(button);
            });
        }
    } catch (error) {
        console.error("Error loading characters:", error);
        characterListEl.innerHTML = ''; // Clear loading
        selectionErrorEl.textContent = `Error loading characters: ${error.message}`;
    }
}

/** Handles clicking on a character in the selection list */
function handleCharacterSelect(characterId) {
    console.log("Character selected:", characterId);
    currentCharacterId = characterId; // Store selected ID

    characterSelectionScreenEl.classList.add('hidden'); // Hide selection screen
    mainContentEl.classList.remove('hidden'); // Show main content area
    characterCreationEl.classList.add('hidden'); // Hide creation form initially
    characterDisplayEl.classList.add('hidden'); // Hide display form initially

    // Setup listener for the selected character - this will trigger display
    setupCharacterListener(characterId);
}

/** Handles clicking the "Create New Character" button */
function handleShowCreationForm() {
    console.log("Showing creation form.");
    currentCharacterId = null; // Ensure no character is selected
    characterData = null; // Clear any previous character data

    characterSelectionScreenEl.classList.add('hidden');
    mainContentEl.classList.remove('hidden');
    characterDisplayEl.classList.add('hidden'); // Hide display sheet
    characterCreationEl.classList.remove('hidden'); // Show creation form

    // Reset creation form fields to defaults
    if (charNameInput) charNameInput.value = '';
    if (statStrInput) statStrInput.value = '10';
    if (statDexInput) statDexInput.value = '10';
    if (statConInput) statConInput.value = '10';
    if (statIntInput) statIntInput.value = '10';
    if (statWisInput) statWisInput.value = '10';
    if (statChaInput) statChaInput.value = '10';
    if (statVigorInput) statVigorInput.value = '10';
    if (statAgilityInput) statAgilityInput.value = '10';
    if (statMindInput) statMindInput.value = '10';
    if (statSpiritInput) statSpiritInput.value = '10';
    if (statSoulLevelInput) statSoulLevelInput.value = '0';
    if (statPrestigeLevelInput) statPrestigeLevelInput.value = '0';
    if (createErrorEl) createErrorEl.textContent = '';

    // Attempt to load DNAs for the form's checkboxes
    loadAvailableDnas().catch(err => console.error("Failed to load DNAs for creation form:", err));
}

/** Handles clicking the "Switch Character" button */
function handleSwitchCharacter() {
    console.log("Switching character...");
    resetUIState(); // Reset the UI (hides main content, clears listeners etc.)

    // Show selection screen again
    if (currentUser) {
         characterSelectionScreenEl.classList.remove('hidden');
         loadUserCharacters(currentUser.uid);
         // Re-check admin status in case it changed (unlikely but possible)
         checkAdminStatusFirestore(currentUserProfile);
    } else {
        // If somehow logged out, show auth screen
        authContainerEl.classList.remove('hidden');
    }
}

// --- Attach Listeners for Selection Screen & Switch Button ---
if (showCreationFormButton) { showCreationFormButton.addEventListener('click', handleShowCreationForm); }
if (switchCharacterButton) { switchCharacterButton.addEventListener('click', handleSwitchCharacter); }


// --- Admin Status Check (Using Firestore) ---
async function getUserProfile(uid, email) {
    if (!uid) { throw new Error("User ID is required for getUserProfile"); }
    const userDocRef = usersCollectionRef.doc(uid); // Use collection ref
    try {
        const doc = await userDocRef.get();
        if (doc.exists) {
            // console.log("User profile found:", doc.data());
            return { uid: doc.id, ...doc.data() }; // Return existing data
        } else {
            // User profile doesn't exist, create it
            console.log("User profile not found for UID, creating:", uid);
            const newUserProfile = {
                email: email || 'N/A', // Store email if available
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: false // Default isAdmin to false
            };
            await userDocRef.set(newUserProfile);
            console.log("User profile created for UID:", uid);
            return { uid: uid, ...newUserProfile }; // Return newly created data
        }
    } catch (error) {
        console.error("Error getting/creating user profile for UID", uid, ":", error);
        throw error; // Propagate error up
    }
}

function checkAdminStatusFirestore(userProfile) {
    // Ensure the button exists before trying to modify it
    if (!openAdminPanelButton) return;

    if (userProfile && userProfile.isAdmin === true) {
        console.log("User is admin (Firestore). Showing admin button.");
        openAdminPanelButton.classList.remove('hidden'); // Show the button
    } else {
        console.log("User is not admin.");
        openAdminPanelButton.classList.add('hidden'); // Ensure button is hidden
    }
}

// --- Admin Panel Logic ---
function toggleAdminPanel(show) { if (show) { adminPanelModal.classList.remove('hidden'); loadDnasForAdminPanel(); } else { adminPanelModal.classList.add('hidden'); } }
if (openAdminPanelButton) { openAdminPanelButton.addEventListener('click', () => toggleAdminPanel(true)); }
if (closeAdminPanelButton) { closeAdminPanelButton.addEventListener('click', () => toggleAdminPanel(false)); }
async function loadDnasForAdminPanel() { adminDnaListLoadingEl.textContent = "Loading..."; adminDnaListLoadingEl.classList.remove('hidden'); adminDnaTable.classList.add('hidden'); adminDnaListErrorEl.textContent = ''; adminDnaTableBody.innerHTML = ''; try { const querySnapshot = await dnasCollectionRef.orderBy("name").get(); if (querySnapshot.empty) { adminDnaListLoadingEl.textContent = "No DNAs found."; return; } querySnapshot.forEach(doc => { const dna = { id: doc.id, ...doc.data() }; const row = adminDnaTableBody.insertRow(); row.insertCell().textContent = dna.name || 'N/A'; row.insertCell().textContent = dna.description || 'N/A'; const actionsCell = row.insertCell(); actionsCell.classList.add('space-x-2'); const editButton = document.createElement('button'); editButton.textContent = 'Edit'; editButton.classList.add('text-sm','px-2','py-1','bg-yellow-400','text-yellow-900','rounded','hover:bg-yellow-500'); editButton.onclick = () => editDnaInAdminPanel(dna); actionsCell.appendChild(editButton); const deleteButton = document.createElement('button'); deleteButton.textContent = 'Delete'; deleteButton.classList.add('text-sm','px-2','py-1','bg-red-500','text-white','rounded','hover:bg-red-600'); deleteButton.dataset.id = dna.id; deleteButton.dataset.name = dna.name; actionsCell.appendChild(deleteButton); }); adminDnaTable.classList.remove('hidden'); adminDnaListLoadingEl.classList.add('hidden'); } catch (error) { console.error("Admin Panel - Error loading DNAs:", error); adminDnaListErrorEl.textContent = `Failed: ${error.message}`; adminDnaListLoadingEl.classList.add('hidden'); } }
async function handleAdminAddDna(event) { event.preventDefault(); adminAddDnaErrorEl.textContent = ''; const name = adminDnaNameInput.value.trim(); const description = adminDnaDescriptionInput.value.trim(); if (!name || !description) { adminAddDnaErrorEl.textContent = "Required."; return; } try { await dnasCollectionRef.add({ name: name, description: description }); console.log("Admin Panel - DNA added"); adminAddDnaForm.reset(); loadDnasForAdminPanel(); loadAvailableDnas(); } catch (error) { console.error("Admin Panel - Error adding DNA:", error); adminAddDnaErrorEl.textContent = `Failed: ${error.message}`; } }
function editDnaInAdminPanel(dna) { const newName = prompt("New name:", dna.name); const newDescription = prompt("New description:", dna.description); if (newName !== null && newDescription !== null && (newName.trim() !== dna.name || newDescription.trim() !== dna.description)) { const updatedData = { name: newName.trim(), description: newDescription.trim() }; dnasCollectionRef.doc(dna.id).update(updatedData).then(() => { console.log("Admin Panel - DNA updated"); loadDnasForAdminPanel(); loadAvailableDnas(); }).catch(error => { console.error("Admin Panel - Error updating DNA:", error); alert(`Failed: ${error.message}`); }); } }
async function handleAdminDeleteDnaClick(event) { if (event.target.tagName === 'BUTTON' && event.target.textContent === 'Delete') { const dnaId = event.target.dataset.id; const dnaName = event.target.dataset.name || 'this DNA'; if (!dnaId) return; if (window.confirm(`ADMIN: Delete "${dnaName}"?`)) { try { await dnasCollectionRef.doc(dnaId).delete(); console.log("Admin Panel - DNA deleted"); loadDnasForAdminPanel(); loadAvailableDnas(); } catch (error) { console.error("Admin Panel - Error deleting DNA:", error); alert(`Failed: ${error.message}`); } } } }
if (adminAddDnaForm) { adminAddDnaForm.addEventListener('submit', handleAdminAddDna); }
if (adminDnaTableBody) { adminDnaTableBody.addEventListener('click', handleAdminDeleteDnaClick); }


// --- Helper Functions ---
function parseNumericInput(value) { if (typeof value !== 'string' || value.trim() === '') { return 0; } const cleanedValue = value.replace(/,/g, '').trim(); const number = Number(cleanedValue); if (!isNaN(number) && Number.isFinite(number)) { return Math.floor(number); } else { console.warn(`Could not parse: "${value}". Returning 0.`); return 0; } }
function calculatePrestigeStat(playerLevel, prestigeLevel) { const pl = playerLevel || 1; const pr = prestigeLevel || 0; const basePerLevel = 2000; const prestigeMultiplier = Math.pow(2, pr); const prestigeFlatBonus = pr * 1000000; const totalValue = (pl * (basePerLevel * prestigeMultiplier)) + prestigeFlatBonus; return Number.isFinite(totalValue) ? Math.floor(totalValue) : 0; }
function calculateSoulHP(maxHp, playerLevel, soulLevel) { let multiplier = 0; const effectiveSoulLevel = soulLevel ?? 0; const pl = playerLevel ?? 1; if (effectiveSoulLevel === 0) multiplier = 100; else if (effectiveSoulLevel === 1) multiplier = 1000; else if (effectiveSoulLevel === 2) multiplier = 10000; else if (effectiveSoulLevel === 3) multiplier = 100000; else if (effectiveSoulLevel === 4) multiplier = 1000000; else if (effectiveSoulLevel === 5) multiplier = 100000000; else if (effectiveSoulLevel >= 6) multiplier = 1000000000; else multiplier = 100; const bonusFromLevels = multiplier * pl; const totalSoulValue = (maxHp ?? 0) + bonusFromLevels; return Number.isFinite(totalSoulValue) ? Math.floor(totalSoulValue) : 0; }


// --- Character Logic (Main App) ---

/** Sets up Firestore listener for the *currently selected* character document */
function setupCharacterListener(characterId) {
    if (!characterId) { console.error("setupCharacterListener missing ID"); return; }
    console.log(`Setting up listener for char ID: ${characterId}`);
    const characterDocRef = charactersCollectionRef.doc(characterId);

    // Detach previous listener if exists
    if (characterDocListener) { characterDocListener(); }

    characterDocListener = characterDocRef.onSnapshot(async (doc) => {
        console.log(`Snapshot received for char ${characterId}. Exists: ${doc.exists}`);
        try {
            // Ensure DNAs are loaded/refreshed before displaying character
            await loadAvailableDnas();

            if (doc.exists) {
                characterData = doc.data(); // Store current character data
                // Verify this data belongs to the current user (extra check)
                if(currentUser && characterData.userId === currentUser.uid) {
                    displayCharacter(characterData); // Display the sheet
                    // updateLastLogin(currentUser.uid); // Update user profile last login
                } else {
                     console.error("Loaded character data does not belong to current user!", characterId, currentUser?.uid);
                     handleSwitchCharacter(); // Go back to selection if data mismatch
                }
            } else {
                console.warn(`Character document ${characterId} not found.`);
                characterData = null;
                handleSwitchCharacter(); // Go back to selection
                alert("The selected character could not be found.");
            }
        } catch (error) {
            console.error("Error during character listener processing:", error);
            alert("An error occurred loading character data.");
            handleSwitchCharacter(); // Go back to selection on error
        }
    }, (error) => {
        console.error(`Listener error for character ${characterId}:`, error);
        alert("Error listening to character updates.");
        handleSwitchCharacter(); // Go back to selection on error
    });
}

/** Saves NEW character data */
function saveCharacter() {
    if (!currentUser) { createErrorEl.textContent = "Must be logged in."; return; }
    createErrorEl.textContent = '';
    saveCharacterButton.disabled = true; saveCharacterButton.textContent = 'Saving...';

    const charName = charNameInput.value.trim();
    const stats = {
        str: parseNumericInput(statStrInput.value), dex: parseNumericInput(statDexInput.value), con: parseNumericInput(statConInput.value),
        int: parseNumericInput(statIntInput.value), wis: parseNumericInput(statWisInput.value), cha: parseNumericInput(statChaInput.value),
        vigor: parseNumericInput(statVigorInput.value), agility: parseNumericInput(statAgilityInput.value),
        mind: parseNumericInput(statMindInput.value), spirit: parseNumericInput(statSpiritInput.value),
    };
    const soulLevel = parseNumericInput(statSoulLevelInput.value);
    const prestigeLevel = parseNumericInput(statPrestigeLevelInput.value);
    const selectedDnaCheckboxes = dnaSelectionOptionsEl.querySelectorAll('input[name="dna"]:checked');
    const selectedDnaIds = Array.from(selectedDnaCheckboxes).map(cb => cb.value);

    if (!charName) { createErrorEl.textContent = "Name required."; saveCharacterButton.disabled = false; saveCharacterButton.textContent = 'Save Character'; return; }

    const newCharacterData = {
        userId: currentUser.uid, // ** Include userId field **
        name: charName, stats: stats, soulLevel: soulLevel, prestigeLevel: prestigeLevel,
        dnas: selectedDnaIds, level: 1, exp: 0, expNeeded: 1000,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log("Adding new character data:", newCharacterData);

    charactersCollectionRef.add(newCharacterData)
        .then((docRef) => {
            console.log("New character saved with ID:", docRef.id);
            handleCharacterSelect(docRef.id); // Load the new character
        })
        .catch((error) => {
            console.error("Error saving new character: ", error);
            createErrorEl.textContent = `Save failed: ${error.message}`;
        })
        .finally(() => {
             saveCharacterButton.disabled = false;
             saveCharacterButton.textContent = 'Save Character';
        });
}

/** Loads available DNAs for main app use */
function loadAvailableDnas() {
    console.log("(Re)Loading available DNAs for main app...");
    return dnasCollectionRef.get().then((querySnapshot) => {
        availableDnas = [];
        querySnapshot.forEach((doc) => {
            if (doc.data().name && doc.data().description) {
                availableDnas.push({ id: doc.id, ...doc.data() });
            }
        });
        // console.log("Main app - Loaded DNAs:", availableDnas.length);
        populateDnaSelectionUI(); // Update creation form checkboxes if visible
        // Refresh displayed character's DNA section if visible
        if (!characterDisplayEl.classList.contains('hidden') && characterData) {
            displayCharacterDNAs(characterData);
        }
    }).catch((error) => {
        console.error("Main app - Error loading DNAs: ", error);
        if(dnaSelectionOptionsEl) dnaSelectionOptionsEl.innerHTML = '<p class="text-red-500 italic text-sm">Error loading DNA options.</p>';
        return Promise.reject(error);
    });
}

/** Populates checkboxes in creation form */
function populateDnaSelectionUI() {
    if (!dnaSelectionOptionsEl) return; // Guard if element doesn't exist
    dnaSelectionOptionsEl.innerHTML = '';
    if (availableDnas.length === 0) {
        dnaSelectionOptionsEl.innerHTML = '<p class="text-gray-500 italic text-sm">No DNAs defined by Admin.</p>';
    } else {
        availableDnas.sort((a, b) => a.name.localeCompare(b.name));
        availableDnas.forEach(dna => {
            const div = document.createElement('div');
            div.classList.add('mb-2');
            const inputId = `dna-checkbox-${dna.id}`;
            div.innerHTML = `<label for="${inputId}" class="inline-flex items-center cursor-pointer"><input type="checkbox" id="${inputId}" name="dna" value="${dna.id}" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"><span class="ml-2 text-sm"><strong class="font-medium">${dna.name}:</strong> ${dna.description}</span></label>`;
            dnaSelectionOptionsEl.appendChild(div);
        });
    }
}

/** Displays the main character sheet */
function displayCharacter(data) {
     console.log("Displaying character:", data?.name);
     if(!data || !currentUser) { handleSwitchCharacter(); return; } // Extra safety check

     displayCharNameEl.textContent = data.name || 'Unnamed';

     const playerLevel = data.level || 1;
     const prestigeLevel = data.prestigeLevel || 0;
     const soulLevel = data.soulLevel ?? 0;

     const prestigeStatValue = calculatePrestigeStat(playerLevel, prestigeLevel);
     const formattedPrestigeValue = prestigeStatValue.toLocaleString();
     const formattedPrestigeModifier = `+${formattedPrestigeValue}`;

     // Update displays
     displayLevelEl.textContent = playerLevel;
     displayExpEl.textContent = data.exp || 0;
     displayExpNeededEl.textContent = data.expNeeded || 1000;
     if(displayMaxHp) displayMaxHp.textContent = formattedPrestigeValue;
     if(displayAc) displayAc.textContent = formattedPrestigeValue;
     if(displaySpeed) displaySpeed.textContent = formattedPrestigeValue;

     // Update Ability Scores (Directly from data.stats)
     if(displayStatStr) displayStatStr.textContent = data.stats?.str ?? '--';
     if(displayStatDex) displayStatDex.textContent = data.stats?.dex ?? '--';
     if(displayStatCon) displayStatCon.textContent = data.stats?.con ?? '--';
     if(displayStatInt) displayStatInt.textContent = data.stats?.int ?? '--';
     if(displayStatWis) displayStatWis.textContent = data.stats?.wis ?? '--';
     if(displayStatCha) displayStatCha.textContent = data.stats?.cha ?? '--';
     if(displayStatVigor) displayStatVigor.textContent = data.stats?.vigor ?? '--';
     if(displayStatAgility) displayStatAgility.textContent = data.stats?.agility ?? '--';
     if(displayStatMind) displayStatMind.textContent = data.stats?.mind ?? '--';
     if(displayStatSpirit) displayStatSpirit.textContent = data.stats?.spirit ?? '--';

     // Update Saves & Skills (Using calculated Prestige Modifier)
     if(displaySaveStr) displaySaveStr.textContent = formattedPrestigeModifier;
     if(displaySaveDex) displaySaveDex.textContent = formattedPrestigeModifier;
     if(displaySaveCon) displaySaveCon.textContent = formattedPrestigeModifier;
     if(displaySaveInt) displaySaveInt.textContent = formattedPrestigeModifier;
     if(displaySaveWis) displaySaveWis.textContent = formattedPrestigeModifier;
     if(displaySaveCha) displaySaveCha.textContent = formattedPrestigeModifier;
     skills.forEach(skill => {
         const skillElement = document.getElementById(`display-skill-${skill}`);
         if (skillElement) { skillElement.textContent = formattedPrestigeModifier; }
     });

     // Update Soul Level & Calculate/Display Soul HP/Power
     if(displaySoulLevel) displaySoulLevel.textContent = soulLevel;
     const soulValue = calculateSoulHP(prestigeStatValue, playerLevel, soulLevel); // Use calculated Max HP
     const formattedSoulValue = soulValue.toLocaleString();
     if(displaySoulHp) displaySoulHp.textContent = formattedSoulValue;
     if(displaySoulPower) displaySoulPower.textContent = formattedSoulValue;

     // Update DNAs
     displayCharacterDNAs(data);

     // Ensure correct views are shown/hidden
     characterCreationEl.classList.add('hidden');
     characterDisplayEl.classList.remove('hidden');
     mainContentEl.classList.remove('hidden'); // Ensure main content is visible
     characterSelectionScreenEl.classList.add('hidden'); // Ensure selection is hidden
}

/** Helper to update only the DNA part of the display */
function displayCharacterDNAs(data) { if (!displayDnasEl) return; displayDnasEl.innerHTML = ''; if (data?.dnas && data.dnas.length > 0) { data.dnas.forEach(dnaId => { const dnaDetail = availableDnas.find(d => d.id === dnaId); const p = document.createElement('p'); if (dnaDetail) { p.innerHTML = `<strong class="font-medium">${dnaDetail.name}:</strong> ${dnaDetail.description}`; } else { p.textContent = `Unknown DNA (ID: ${dnaId})`; p.classList.add('text-red-500', 'italic'); } displayDnasEl.appendChild(p); }); } else { displayDnasEl.innerHTML = '<p class="text-gray-500 italic">No DNAs recorded.</p>'; } }

/** Updates lastLogin timestamp in USER profile doc */
function updateLastLogin(userId) { if(!userId) return; const userDocRef = usersCollectionRef.doc(userId); userDocRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }).then(() => console.log("User last login updated.")).catch(error => console.error("Error updating user last login:", error)); }


// --- Event Listener Binding for Character Save ---
if (saveCharacterButton) { saveCharacterButton.addEventListener('click', saveCharacter); }

// --- Initial Load ---
console.log("app.js (multi-character with Prestige) loaded.");