const Diff = require('diff');

function generateDiffHtml(original, corrected) {
  const diff = Diff.diffWords(original, corrected);
  
  let html = '';
  const corrections = [];
  let correctionIndex = 0;
  
  // Group corrections: a removed followed by added is one correction
  // A standalone removed or added is also a correction
  let i = 0;
  while (i < diff.length) {
    const part = diff[i];
    const text = escapeHtml(part.value);
    
    if (part.removed) {
      // Check if next part is added (replacement)
      const nextPart = diff[i + 1];
      if (nextPart && nextPart.added) {
        // This is a replacement correction
        const addedText = escapeHtml(nextPart.value);
        html += `<span class="correction-group" data-correction-index="${correctionIndex}">`;
        html += `<span class="diff-removed">${text}</span>`;
        html += `<span class="diff-added">${addedText}</span>`;
        html += `</span>`;
        
        corrections.push({
          index: correctionIndex,
          type: 'replace',
          removed: part.value,
          added: nextPart.value
        });
        
        correctionIndex++;
        i += 2; // Skip both removed and added
      } else {
        // Standalone removal
        html += `<span class="correction-group" data-correction-index="${correctionIndex}">`;
        html += `<span class="diff-removed">${text}</span>`;
        html += `</span>`;
        
        corrections.push({
          index: correctionIndex,
          type: 'remove',
          removed: part.value,
          added: ''
        });
        
        correctionIndex++;
        i++;
      }
    } else if (part.added) {
      // Standalone addition
      html += `<span class="correction-group" data-correction-index="${correctionIndex}">`;
      html += `<span class="diff-added">${text}</span>`;
      html += `</span>`;
      
      corrections.push({
        index: correctionIndex,
        type: 'add',
        removed: '',
        added: part.value
      });
      
      correctionIndex++;
      i++;
    } else {
      // Unchanged text
      html += `<span class="diff-unchanged">${text}</span>`;
      i++;
    }
  }
  
  return { html, corrections };
}

function escapeHtml(text) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}

module.exports = { generateDiffHtml };
