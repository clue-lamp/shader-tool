let myShader;
let shiftSlider, densitySlider, speedSlider;
let fadeStartInnerSlider, fadeEndInnerSlider;
let fadeStartOuterSlider, fadeEndOuterSlider;
let lineStart = null;
let lineEnd = null;
let dragging = false;
let progress = 0;
let ringShiftProgress = 0;
let lastTime = 0;
let distanceMode = 0; // 0 = circle, 1 = line, 2 = path, 4 = metaballs
let pathCanvas, pathGraphics;
let showRawCanvas = false; // toggle between shader view and raw canvas view
let isSliderActive = false; // track if any slider is being interacted with
let paintTool = 'brush'; // 'brush', 'line', 'square', 'circle'
let paintStart = null; // starting point for line/square/circle
let paintInfoDiv; // HTML element for paint info
let metaballs = []; // array to store metaball objects
let metaballCanvas; // canvas for metaball rendering
let isNegativeMode = false; // toggle between positive and negative drawing
let fpsDiv; // HTML element for FPS display
let metaballSize = 50; // current metaball size for preview
let metaballBlurImage; // pre-rendered blurry circle for optimization
let metaballThreshold = 0.3; // threshold for metaball effect

function keyPressed() {
  if (key === '1') {
    distanceMode = 0;
    updateSliderVisibility();
  }
  if (key === '2') {
    distanceMode = 1;
    updateSliderVisibility();
  }
  if (key === '3') {
    distanceMode = 2;
    pathCanvas.clear();
    pathGraphics.clear();
    updateSliderVisibility();
  }
  if (key === '4') {
    distanceMode = 3;
    initMetaballs();
    updateSliderVisibility();
  }
  if (key === 'c' || key === 'C') {
    showRawCanvas = !showRawCanvas;
  }
  // Paint tools (only in paint mode)
  if (distanceMode === 2) {
    if (key === 'b' || key === 'B') paintTool = 'brush';
    if (key === 'l' || key === 'L') paintTool = 'line';
    if (key === 's' || key === 'S') paintTool = 'square';
    if (key === 'o' || key === 'O') paintTool = 'circle';
    if (key === 'n' || key === 'N') isNegativeMode = !isNegativeMode;
  }
}

function preload() {
  myShader = loadShader('shader.vert', 'shader.frag');
  myFont = loadFont('Roboto-Regular.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  textFont(myFont);
  textSize(16);
  fill(255);
  noStroke();
  frameRate(120);

  let y = 10;
  shiftSlider = createLabeledSlider('Shift', 0.0, 5.0, 1.0, 0.01, y); y += 30;
  densitySlider = createLabeledSlider('Density', 1.0, 10.0, 3.8, 0.1, y); y += 30;
  channelNoiseSpeed = createLabeledSlider('Channel Speed', 0.0, 1.0, 0.2, 0.01, y); y += 30;
  ringShiftSpeedSlider = createLabeledSlider('Ring Shift Speed', 0.0, 10.0, 0.1, 0.01, y); y += 30;
  shiftAmountSlider = createLabeledSlider('Ring Shift Power', 0.0, 2.0, 0.5, 0.01, y); y += 50;
  fadeStartInnerSlider = createLabeledSlider('Fade Start Inner', 0.0, 0.8, 0.0, 0.01, y); y += 30;
  fadeEndInnerSlider = createLabeledSlider('Fade End Inner', 0.0, 0.8, 0.1, 0.01, y); y += 30;
  fadeStartOuterSlider = createLabeledSlider('Fade Start Outer', 0.5, 1.0, 0.85, 0.01, y); y += 30;
  fadeEndOuterSlider = createLabeledSlider('Fade End Outer', 0.5, 1.0, 1.0, 0.01, y); y += 50

  brushSizeSlider = createLabeledSlider('Brush Size', 1, 300, 100, 1, y); y += 30;
  blurAmountSlider = createLabeledSlider('Blur Amount', 0, 100, 30, 1, y); y += 50;
  
  // Lava mode specific sliders
  metaballThresholdSlider = createLabeledSlider('Lava Threshold', 0.0, 1.0, 0.3, 0.05, y); y += 30;
  metaballSpeedSlider = createLabeledSlider('Lava Speed', 0.0, 1.0, 0.1, 0.05, y); y += 30;
  metaballStrokeSlider = createLabeledSlider('Lava Stroke', 0, 50, 0, 1, y); y += 30;
  
  // Initially hide lava sliders (with safety checks)
  if (metaballThresholdSlider && metaballThresholdSlider.parent() && metaballThresholdSlider.parent().elt) {
    metaballThresholdSlider.parent().elt.style.display = 'none';
  }
  if (metaballSpeedSlider && metaballSpeedSlider.parent() && metaballSpeedSlider.parent().elt) {
    metaballSpeedSlider.parent().elt.style.display = 'none';
  }
  if (metaballStrokeSlider && metaballStrokeSlider.parent() && metaballStrokeSlider.parent().elt) {
    metaballStrokeSlider.parent().elt.style.display = 'none';
  }

  pathCanvas = createGraphics(width, height);
  pathCanvas.pixelDensity(1);
  pathCanvas.clear();
  pathGraphics = createGraphics(width, height);
  pathGraphics.pixelDensity(1);
  pathGraphics.clear();

  // Create metaball canvas (full screen)
  metaballCanvas = createGraphics(width, height);
  metaballCanvas.pixelDensity(1);
  
  // Create pre-rendered blurry circle for optimization
  metaballBlurImage = createGraphics(100 * 4, 100 * 4); // Use default size of 100
  metaballBlurImage.background(0, 0, 0, 0);
  metaballBlurImage.fill(0, 0, 0, 200);
  metaballBlurImage.noStroke();
  metaballBlurImage.ellipse(100 * 2, 100 * 2, 100, 100);
  metaballBlurImage.filter(BLUR, 100 / 2);

  // Create paint info display
  paintInfoDiv = createDiv('').position(width - 260, 10).style('background-color', 'rgba(0,0,0,0.7)').style('color', 'white').style('padding', '10px').style('font-family', 'monospace').style('font-size', '14px').style('border-radius', '5px');

  // Create FPS display
  fpsDiv = createDiv('').position(width - 80, height - 30).style('background-color', 'rgba(0,0,0,0.7)').style('color', 'white').style('padding', '5px').style('font-family', 'monospace').style('font-size', '12px').style('border-radius', '3px');
  
  // Create mode selector display
  modeSelectorDiv = createDiv('').position(10, height - 30).style('background-color', 'rgba(0,0,0,0.7)').style('color', 'white').style('padding', '5px').style('font-family', 'monospace').style('font-size', '12px').style('border-radius', '3px');

  lastTime = millis() / 1000;
}

function draw() {
  // Update shader parameters even when sliders are active
  // but skip the main rendering loop to prevent interference
  
  if (lineStart && lineEnd) {
    let start = [(lineStart[0] / width) * 2.0 - 1.0, -((lineStart[1] / height) * 2.0 - 1.0)];
    let end = [(lineEnd[0] / width) * 2.0 - 1.0, -((lineEnd[1] / height) * 2.0 - 1.0)];
    myShader.setUniform("lineStart", start);
    myShader.setUniform("lineEnd", end);
  }

  let now = millis() / 1000;
  let dt = now - lastTime;
  lastTime = now;
  progress += dt * channelNoiseSpeed.value();
  ringShiftProgress += dt * ringShiftSpeedSlider.value();

  // Update shader parameters (always, even when sliders are active)
  if (distanceMode === 2) {
    pathGraphics.clear();
    pathGraphics.image(pathCanvas, 0, 0);
    pathGraphics.filter(BLUR, blurAmountSlider.value());
    myShader.setUniform("pathTexture", pathGraphics);
  } else if (distanceMode === 3) {
    // Update metaball positions and render them
    updateMetaballs();
    
    // No border needed for full screen canvas
    

    
    // Set metaball canvas as shader texture
    myShader.setUniform("pathTexture", metaballCanvas);
  }

  // Skip rendering if sliders are active to prevent interference
  if (isSliderActive) {
    return;
  }

  // Check if we should show raw canvas instead of shader
  if (showRawCanvas && distanceMode === 2) {
    // Show the raw canvas for paint mode
    resetShader();
    camera();
    background(0); // Clear to black background
    image(pathCanvas, -width/2, -height/2, width, height);
  } else if (distanceMode === 3) {
    // Show shader view for lava mode (with option to toggle to raw)
    if (showRawCanvas) {
      // Show raw metaball canvas
      resetShader();
      camera();
      background(0); // Clear to black background
      // Display full screen metaball canvas
      image(metaballCanvas, -width/2, -height/2, width, height);
    } else {
      // Show shader view (default)
      shader(myShader);
      myShader.setUniform("resolution", [width, height]);
      myShader.setUniform("progress", progress);
      myShader.setUniform("ringShiftProgress", ringShiftProgress);
      myShader.setUniform("shift", shiftSlider.value());
      myShader.setUniform("density", densitySlider.value());
      myShader.setUniform("shiftSpeed", ringShiftSpeedSlider.value());
      myShader.setUniform("shiftAmount", shiftAmountSlider.value());
      myShader.setUniform("distanceMode", distanceMode);
      myShader.setUniform("fadeStartInner", fadeStartInnerSlider.value());
      myShader.setUniform("fadeEndInner", fadeEndInnerSlider.value());
      myShader.setUniform("fadeStartOuter", fadeStartOuterSlider.value());
      myShader.setUniform("fadeEndOuter", fadeEndOuterSlider.value());

      beginShape();
      vertex(-1, -1, 0, 0, 0);
      vertex(1, -1, 0, 1, 0);
      vertex(1, 1, 0, 1, 1);
      vertex(-1, 1, 0, 0, 1);
      endShape(CLOSE);

      resetShader();
      camera();
    }
  } else {
    // Show the shader view
    shader(myShader);
    myShader.setUniform("resolution", [width, height]);
    myShader.setUniform("progress", progress);
    myShader.setUniform("ringShiftProgress", ringShiftProgress);
    myShader.setUniform("shift", shiftSlider.value());
    myShader.setUniform("density", densitySlider.value());
    myShader.setUniform("shiftSpeed", ringShiftSpeedSlider.value());
    myShader.setUniform("shiftAmount", shiftAmountSlider.value());
    myShader.setUniform("distanceMode", distanceMode);
    myShader.setUniform("fadeStartInner", fadeStartInnerSlider.value());
    myShader.setUniform("fadeEndInner", fadeEndInnerSlider.value());
    myShader.setUniform("fadeStartOuter", fadeStartOuterSlider.value());
    myShader.setUniform("fadeEndOuter", fadeEndOuterSlider.value());

    beginShape();
    vertex(-1, -1, 0, 0, 0);
    vertex(1, -1, 0, 1, 0);
    vertex(1, 1, 0, 1, 1);
    vertex(-1, 1, 0, 0, 1);
    endShape(CLOSE);

    resetShader();
    camera();
  }
  
  // Update paint info display
  if (distanceMode === 0) {
    updateModeInfo();
  } else if (distanceMode === 2) {
    updatePaintInfo();
    drawBrushPreview();
  } else if (distanceMode === 3) {
    updateMetaballInfo();
    drawMetaballPreview();
  } else {
    paintInfoDiv.hide();
  }
  
  // Update FPS display
  updateFPS();
  
  // Update mode selector display
  updateModeSelector();
  
  // Apply threshold filter at the very end for lava mode (like BASE_METABALLS)
  // Removed threshold filter to allow shader gradients to work
  // if (distanceMode === 3) {
  //   filter(THRESHOLD, metaballThresholdSlider.value());
  // }
}

function createLabeledSlider(labelText, min, max, defaultVal, step, yPos) {
  const container = createDiv().position(10, yPos).style('width', '300px').style('margin-bottom', '10px');
  
  // Create slider with custom styling
  const slider = createSlider(min, max, defaultVal, step).parent(container);
  slider.class('slider');
  
  // Create label overlay centered on slider
  const label = createDiv(labelText + ' ' + nf(defaultVal, 1, 2))
    .parent(container)
    .style('position', 'absolute')
    .style('top', '50%')
    .style('left', '50%')
    .style('transform', 'translate(-50%, -50%)')
    .style('color', 'white')
    .style('font-family', 'monospace')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '10')
    .style('text-align', 'center')
    .style('white-space', 'nowrap')
    .style('overflow', 'hidden')
    .style('text-overflow', 'ellipsis');
  
  // Update label when slider changes (both while dragging and on release)
  slider.input(() => {
    label.html(labelText + ' ' + nf(slider.value(), 1, 2));
  });
  
  slider.changed(() => {
    label.html(labelText + ' ' + nf(slider.value(), 1, 2));
  });
  
  // Add event listeners to track slider interactions
  slider.mousePressed(() => { isSliderActive = true; });
  slider.mouseReleased(() => { isSliderActive = false; });
  slider.touchStarted(() => { isSliderActive = true; });
  slider.touchEnded(() => { isSliderActive = false; });
  
  return slider;
}

function mousePressed() {
  if (isSliderActive) return; // Don't handle mouse events when sliders are active
  
  if (distanceMode === 2 && paintTool !== 'brush') {
    // Start drawing line/square/circle
    paintStart = [mouseX, mouseY];
    dragging = true;
  } else if (distanceMode === 3) {
    if (mouseButton === RIGHT) {
      // Remove metaball on right-click
      if (metaballs.length > 1) {
        metaballs.splice(0, 1);
      }
    } else {
      // Add metaball on left-click with current brush size
      metaballSize = brushSizeSlider.value(); // Use brush size for metaballs
      
      // Convert mouse coordinates to metaball canvas coordinates (full screen)
      let metaballX = mouseX;
      let metaballY = mouseY;
      
      // Ensure coordinates are within the full screen bounds
      metaballX = constrain(metaballX, 0, width);
      metaballY = constrain(metaballY, 0, height);
      
      metaballs.push({
        x: metaballX,
        y: metaballY,
        nx: random(100),
        ny: random(100),
        size: metaballSize
      });
      

    }
  } else if (!dragging) {
    lineStart = [mouseX, mouseY];
    dragging = true;
  }
}

function mouseReleased() {
  if (isSliderActive) return; // Don't handle mouse events when sliders are active
  
  if (dragging) {
    if (distanceMode === 2 && paintStart && paintTool !== 'brush') {
      // Finish drawing line/square/circle
      drawShape(paintStart[0], paintStart[1], mouseX, mouseY, paintTool);
      paintStart = null;
    } else {
      lineEnd = [mouseX, mouseY];
    }
    dragging = false;
  }
}

function mouseDragged() {
  if (distanceMode === 2 && paintTool === 'brush' && !isSliderActive) {
    if (isNegativeMode) {
      pathCanvas.stroke(0); // Black for negative drawing
    } else {
      pathCanvas.stroke(255); // White for positive drawing
    }
    pathCanvas.strokeWeight(brushSizeSlider.value());
    pathCanvas.line(pmouseX, pmouseY, mouseX, mouseY);
  }
}

function mouseWheel(event) {
  if (distanceMode === 2) {
    // Change brush size with mouse wheel (inverted direction)
    let currentSize = brushSizeSlider.value();
    let newSize = currentSize + (event.delta > 0 ? -5 : 5);
    newSize = constrain(newSize, 1, 300); // Keep within slider bounds
    brushSizeSlider.value(newSize);
  } else if (distanceMode === 3) {
    // Change metaball size with mouse wheel (inverted direction) - use brush size slider
    let newSize = brushSizeSlider.value() + (event.delta > 0 ? -5 : 5);
    // Limit size to prevent crashes (max 150)
    newSize = constrain(newSize, 1, 300);
    brushSizeSlider.value(newSize);
    metaballSize = brushSizeSlider.value(); // Use brush size for metaballs
  }
}

function drawShape(x1, y1, x2, y2, tool) {
  if (isNegativeMode) {
    pathCanvas.stroke(0); // Black for negative drawing
  } else {
    pathCanvas.stroke(255); // White for positive drawing
  }
  pathCanvas.strokeWeight(brushSizeSlider.value());
  pathCanvas.noFill();
  
  if (tool === 'line') {
    pathCanvas.line(x1, y1, x2, y2);
  } else if (tool === 'square') {
    let w = x2 - x1;
    let h = y2 - y1;
    pathCanvas.rect(x1, y1, w, h);
  } else if (tool === 'circle') {
    let diameter = dist(x1, y1, x2, y2);
    pathCanvas.circle(x1, y1, diameter);
  }
}

function updatePaintInfo() {
  paintInfoDiv.show();
  let infoText = `
    <strong>PAINT MODE INFO:</strong><br>
    Tool: ${paintTool.toUpperCase()}<br>
    Mode: ${isNegativeMode ? "NEGATIVE" : "POSITIVE"}<br>
    Brush Size: ${brushSizeSlider.value()}<br>
    Blur Amount: ${blurAmountSlider.value()}<br>
    View: ${showRawCanvas ? "RAW" : "SHADER"}<br><br>
    <strong>SHORTCUTS:</strong><br>
    B - Brush | L - Line<br>
    S - Square | O - Circle<br>
    N - Toggle Negative Mode<br>
    C - Toggle view<br>
    Mouse Wheel - Brush Size
  `;
  paintInfoDiv.html(infoText);
}

function initMetaballs() {
  metaballs = [];
  // Start with 0 metaballs - user will add them manually
}

function updateMetaballs() {
  // Clear the canvas completely
  metaballCanvas.clear();
  metaballCanvas.background(0, 0, 0, 0);
  
  // If no metaballs, just return
  if (metaballs.length === 0) {
    return;
  }
  
  // Update metaball positions with Perlin noise movement
  let speedMultiplier = metaballSpeedSlider ? metaballSpeedSlider.value() : 1.0;
  
  for (let ball of metaballs) {
    // Safety check - ensure ball has required properties
    if (!ball || typeof ball.x === 'undefined' || typeof ball.y === 'undefined') {
      continue;
    }
    
    // Use Perlin noise for organic movement with speed multiplier
    ball.x += map(noise(ball.nx || 0), 0, 1, -2, 2) * speedMultiplier;
    ball.y += map(noise(ball.ny || 0), 0, 1, -2, 2) * speedMultiplier;
    
    ball.nx = (ball.nx || 0) + 0.01;
    ball.ny = (ball.ny || 0) + 0.01;
    
    // Wrap around edges - use ball's individual size
    let size = ball.size || 50; // Default size if missing
    if (ball.x < -size/2) ball.x = width + size/2;
    if (ball.x > width + size/2) ball.x = -size/2;
    if (ball.y < -size/2) ball.y = height + size/2;
    if (ball.y > height + size/2) ball.y = -size/2;
  }
  
  // Draw all metaballs as white circles using brush size
  let strokeWidth = metaballStrokeSlider ? metaballStrokeSlider.value() : 0;
  
  if (strokeWidth > 0) {
    // Draw stroked circles
    metaballCanvas.noFill();
    metaballCanvas.stroke(255);
    metaballCanvas.strokeWeight(strokeWidth);
  } else {
    // Draw filled circles
    metaballCanvas.fill(255);
    metaballCanvas.noStroke();
  }
  
  for (let ball of metaballs) {
    // Safety check before drawing
    if (ball && typeof ball.x === 'number' && typeof ball.y === 'number' && typeof ball.size === 'number') {
      metaballCanvas.circle(ball.x, ball.y, ball.size);
    }
  }
  
  // Step 1: Apply blur to create soft edges
  metaballCanvas.filter(BLUR, blurAmountSlider.value());
  
  // Step 2: Set color mode and blend mode like BASE_METABALLS
  metaballCanvas.colorMode(HSB);
  metaballCanvas.blendMode(ADD);
}

function updateModeInfo() {
  paintInfoDiv.show();
  let infoText = `
    <strong>SHADER MODES:</strong><br>
    Current: Circle Mode<br><br>
    <strong>AVAILABLE MODES:</strong><br>
    1 - Circle Mode<br>
    2 - Line Mode<br>
    3 - Paint Mode<br>
    4 - Metaball Mode<br><br>
    <strong>GENERAL CONTROLS:</strong><br>
    C - Toggle raw/shader view<br>
    Adjust sliders for effects
  `;
  paintInfoDiv.html(infoText);
}

function updateFPS() {
  fpsDiv.show();
  fpsDiv.html('FPS: ' + Math.round(frameRate()));
}

function updateModeSelector() {
  let modeNames = ['Circle', 'Line', 'Paint', 'Lava'];
  let currentMode = modeNames[distanceMode] || 'Unknown';
  let modeNumber = distanceMode + 1;
  modeSelectorDiv.html('Mode: ' + modeNumber + ' (' + currentMode + ') | Press 1-4 to switch');
}

function updateSliderVisibility() {
  // Show/hide lava sliders based on current mode (with safety checks)
  if (distanceMode === 3) {
    if (metaballThresholdSlider && metaballThresholdSlider.parent() && metaballThresholdSlider.parent().elt) {
      metaballThresholdSlider.parent().elt.style.display = 'block';
    }
    if (metaballSpeedSlider && metaballSpeedSlider.parent() && metaballSpeedSlider.parent().elt) {
      metaballSpeedSlider.parent().elt.style.display = 'block';
    }
    if (metaballStrokeSlider && metaballStrokeSlider.parent() && metaballStrokeSlider.parent().elt) {
      metaballStrokeSlider.parent().elt.style.display = 'block';
    }
  } else {
    if (metaballThresholdSlider && metaballThresholdSlider.parent() && metaballThresholdSlider.parent().elt) {
      metaballThresholdSlider.parent().elt.style.display = 'none';
    }
    if (metaballSpeedSlider && metaballSpeedSlider.parent() && metaballSpeedSlider.parent().elt) {
      metaballSpeedSlider.parent().elt.style.display = 'none';
    }
    if (metaballStrokeSlider && metaballStrokeSlider.parent() && metaballStrokeSlider.parent().elt) {
      metaballStrokeSlider.parent().elt.style.display = 'none';
    }
  }
}

function drawMetaballPreview() {
  // Switch to 2D mode for UI drawing
  resetShader();
  camera();
  
  // Convert WEBGL coordinates to screen coordinates
  let screenX = mouseX - width/2;
  let screenY = mouseY - height/2;
  
  // Full screen metaball area
  let metaballAreaX = -(width/2);
  let metaballAreaY = -(height/2);
  let metaballAreaSize = width;
  
  if (screenX >= metaballAreaX && screenX <= metaballAreaX + metaballAreaSize &&
      screenY >= metaballAreaY && screenY <= metaballAreaY + metaballAreaSize) {
    
    // Use brush size for metaball preview
    let previewSize = brushSizeSlider.value();
    
    // Draw metaball preview circle
    noFill();
    stroke(255, 0, 255, 150); // Semi-transparent magenta for metaball preview
    strokeWeight(2);
    circle(screenX, screenY, previewSize);
    
    // Draw center dot
    fill(255, 0, 255, 200); // Magenta for metaball preview
    noStroke();
    circle(screenX, screenY, 3);
  }
}



function updateMetaballInfo() {
  paintInfoDiv.show();
  let viewMode = showRawCanvas ? "RAW" : "CLUE";
  let infoText = `
    <strong>METABALL MODE:</strong><br>
    Lava Lamp Effect<br>
    ${metaballs.length} Metaballs<br>
    Size: ${metaballSize}<br>
    View: ${viewMode}<br>
    Press C to toggle view<br><br>
    <strong>CONTROLS:</strong><br>
    Click to add metaball<br>
    Right-click to remove<br>
    Mouse Wheel - Change size<br>
    4 - Return to this mode
  `;
  paintInfoDiv.html(infoText);
}

function drawBrushPreview() {
  // Switch to 2D mode for UI drawing
  resetShader();
  camera();
  
  // Convert WEBGL coordinates to screen coordinates
  let screenX = mouseX - width/2;
  let screenY = mouseY - height/2;
  
  // Draw brush preview circle
  noFill();
  if (isNegativeMode) {
    stroke(255, 0, 0, 150); // Semi-transparent red for negative mode
  } else {
    stroke(255, 150); // Semi-transparent white for positive mode
  }
  strokeWeight(2);
  circle(screenX, screenY, brushSizeSlider.value());
  
  // Draw center dot
  if (isNegativeMode) {
    fill(255, 0, 0, 200); // Red for negative mode
  } else {
    fill(255, 200); // White for positive mode
  }
  noStroke();
  circle(screenX, screenY, 3);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pathCanvas = createGraphics(width, height);
  pathCanvas.pixelDensity(1);
  pathCanvas.clear();
  pathGraphics = createGraphics(width, height);
  pathGraphics.pixelDensity(1);
  pathGraphics.clear();
  
  // Recreate metaball canvas with new dimensions
  metaballCanvas = createGraphics(width, height);
  metaballCanvas.pixelDensity(1);
  
  // Update UI element positions
  if (fpsDiv) fpsDiv.position(width - 80, height - 30);
  if (modeSelectorDiv) modeSelectorDiv.position(10, height - 30);
}
