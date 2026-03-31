// DOM Elements
const thinkingContainer = document.getElementById('thinkingContainer');
const errorContainer = document.getElementById('errorContainer');
const successContainer = document.getElementById('successContainer');
const errorText = document.getElementById('errorText');
const diffContainer = document.getElementById('diffContainer');
const diffContent = document.getElementById('diffContent');
const actionsContainer = document.getElementById('actionsContainer');
const closeBtn = document.getElementById('closeBtn');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');

// State for per-correction navigation
let currentCorrectedText = '';
let originalText = '';
let corrections = [];
let currentIndex = 0;
let decisions = []; // true = accepted, false = rejected

// Hide all states
function hideAllStates() {
  thinkingContainer.classList.remove('active');
  errorContainer.classList.remove('active');
  successContainer.classList.remove('active');
  diffContainer.classList.remove('active');
  actionsContainer.classList.remove('active');
}

// Show thinking state
function showThinking() {
  hideAllStates();
  thinkingContainer.classList.add('active');
}

// Show error state
function showError(message) {
  hideAllStates();
  errorText.textContent = message;
  errorContainer.classList.add('active');
}

// Show success state then close after 1.5 seconds
function showSuccess() {
  hideAllStates();
  successContainer.classList.add('active');
  
  // Build final text based on decisions
  console.log('Decisions:', decisions);
  const finalText = buildFinalText();
  console.log('Final text:', finalText);
  
  setTimeout(() => {
    window.api.acceptCorrection(finalText);
  }, 1500);
}

// Build the final text based on user decisions
function buildFinalText() {
  let finalText = '';
  
  // Get all direct children of diffContent
  const children = diffContent.children;
  console.log('Building final text. Children count:', children.length);
  console.log('Decisions array:', JSON.stringify(decisions));
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    
    if (child.classList.contains('diff-unchanged')) {
      // Unchanged text - always include
      const text = child.textContent;
      console.log(`Child ${i}: unchanged, adding "${text}"`);
      finalText += text;
    } else if (child.classList.contains('correction-group')) {
      const index = parseInt(child.dataset.correctionIndex);
      const decision = decisions[index];
      const added = child.querySelector('.diff-added');
      const removed = child.querySelector('.diff-removed');
      
      console.log(`Child ${i}: correction ${index}, decision=${decision}, added="${added?.textContent}", removed="${removed?.textContent}"`);
      
      if (decision === true) {
        // Accepted: use the added/corrected text
        finalText += added ? added.textContent : '';
        console.log(`  -> Using ADDED text`);
      } else {
        // Rejected (decision === false) or not decided (null): keep original
        finalText += removed ? removed.textContent : '';
        console.log(`  -> Using REMOVED text`);
      }
    }
  }
  
  console.log('Final text result:', finalText);
  return finalText;
}

// Focus on a specific correction with cinematic zoom animation
function focusCorrection(index) {
  // Remove focus styling from all corrections
  const allGroups = diffContent.querySelectorAll('.correction-group');
  allGroups.forEach(g => {
    g.classList.remove('correction-focused');
  });
  
  // Focus current correction
  const current = diffContent.querySelector(`[data-correction-index="${index}"]`);
  if (!current) return;
  
  current.classList.add('correction-focused');
  
  // IMPORTANT: Reset transform first to get accurate positions
  const container = diffContent;
  container.classList.remove('zoomed-in', 'zooming-out');
  container.style.transform = '';
  container.style.transformOrigin = 'center center';
  
  // Force a reflow to ensure positions are recalculated
  void container.offsetHeight;
  
  // Scroll the correction into view first (centered)
  current.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
  
  // Force another reflow after scroll
  void container.offsetHeight;
  
  // Get positions AFTER scroll
  const containerRect = container.getBoundingClientRect();
  const correctionRect = current.getBoundingClientRect();
  
  // Calculate how far the correction center is from the container center
  const containerCenterX = containerRect.left + containerRect.width / 2;
  const containerCenterY = containerRect.top + containerRect.height / 2;
  const correctionCenterX = correctionRect.left + correctionRect.width / 2;
  const correctionCenterY = correctionRect.top + correctionRect.height / 2;
  
  // Calculate the offset needed to center the correction
  const offsetX = containerCenterX - correctionCenterX;
  const offsetY = containerCenterY - correctionCenterY;
  
  // Store the offset for use in zoom animation
  container.dataset.zoomOffsetX = offsetX;
  container.dataset.zoomOffsetY = offsetY;
  
  // Apply the transform: translate to center, then scale
  requestAnimationFrame(() => {
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    container.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(2)`;
    container.classList.add('zoomed-in');
  });
  
  // Update counter display
  updateCounter();
}

// Update the correction counter
function updateCounter() {
  const counterEl = document.getElementById('correctionCounter');
  if (counterEl) {
    counterEl.textContent = `Correction ${currentIndex + 1} of ${corrections.length}`;
  }
}

// Handle accepting/rejecting current correction
function handleCorrectionDecision(accepted) {
  if (currentIndex >= corrections.length) return;
  
  // Store decision
  decisions[currentIndex] = accepted;
  console.log(`Decision for correction ${currentIndex}: ${accepted ? 'ACCEPTED' : 'REJECTED'}`);
  
  // Get current correction element
  const current = diffContent.querySelector(`[data-correction-index="${currentIndex}"]`);
  if (current) {
    // Remove focus, add decided class with appropriate styling
    current.classList.remove('correction-focused');
    current.classList.add('correction-decided');
    current.classList.add(accepted ? 'correction-accepted' : 'correction-rejected');
  }
  
  // Zoom out by resetting transform
  diffContent.classList.remove('zoomed-in');
  diffContent.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
  diffContent.style.transform = 'translate(0, 0) scale(1)';
  
  // Move to next correction after zoom-out animation
  setTimeout(() => {
    diffContent.style.transform = '';
    diffContent.style.transition = '';
    currentIndex++;
    
    if (currentIndex >= corrections.length) {
      // All corrections reviewed
      showSuccess();
    } else {
      focusCorrection(currentIndex);
    }
  }, 350);
}

// Show diff state with per-correction navigation
function showDiff(data) {
  hideAllStates();
  
  // Store data
  currentCorrectedText = data.corrected;
  originalText = data.original;
  corrections = data.corrections || [];
  currentIndex = 0;
  decisions = new Array(corrections.length).fill(null);
  
  // Set diff HTML
  diffContent.innerHTML = data.diffHtml;
  
  // Show containers
  diffContainer.classList.add('active');
  actionsContainer.classList.add('active');
  
  // If there are corrections, focus the first one
  if (corrections.length > 0) {
    setTimeout(() => {
      focusCorrection(0);
    }, 100);
  } else {
    // No corrections, just show success
    showSuccess();
  }
}

// Handle accept all remaining
function handleAcceptAll() {
  // Accept all remaining corrections
  for (let i = currentIndex; i < corrections.length; i++) {
    decisions[i] = true;
    const el = diffContent.querySelector(`[data-correction-index="${i}"]`);
    if (el) {
      el.classList.remove('correction-focused');
      el.classList.add('correction-decided', 'correction-accepted');
    }
  }
  showSuccess();
}

// Handle reject all remaining
function handleRejectAll() {
  // Reject all remaining corrections
  for (let i = currentIndex; i < corrections.length; i++) {
    decisions[i] = false;
    const el = diffContent.querySelector(`[data-correction-index="${i}"]`);
    if (el) {
      el.classList.remove('correction-focused');
      el.classList.add('correction-decided', 'correction-rejected');
    }
  }
  showSuccess();
}

// Event Listeners
closeBtn.addEventListener('click', () => {
  window.api.closeOverlay();
});

acceptBtn.addEventListener('click', handleAcceptAll);
rejectBtn.addEventListener('click', handleRejectAll);

// Keyboard shortcuts for per-correction navigation
document.addEventListener('keydown', (e) => {
  console.log('Key pressed:', e.key, 'actionsActive:', actionsContainer.classList.contains('active'));
  if (!actionsContainer.classList.contains('active')) return;
  
  if (e.key === 'Escape') {
    // Reject current correction
    console.log('ESC detected - rejecting');
    handleCorrectionDecision(false);
    e.preventDefault();
  } else if (e.key === 'Enter') {
    // Accept current correction
    console.log('ENTER detected - accepting');
    handleCorrectionDecision(true);
    e.preventDefault();
  }
});

// IPC Listeners
window.api.onSetThinking((isThinking) => {
  if (isThinking) {
    showThinking();
  }
});

window.api.onShowDiff((data) => {
  showDiff(data);
});

window.api.onShowError((message) => {
  showError(message);
});

// Initialize with thinking state hidden
hideAllStates();
