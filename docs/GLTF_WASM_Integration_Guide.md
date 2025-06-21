# GLTF WASM Integration Guide

## Overview

This guide explains how to integrate GLTF 3D model files with the Bevy WASM engine in the daemon-clean project. Follow this guide to avoid common pitfalls and ensure proper rendering of 3D program parts.

## The Problem We Solved

When integrating GLTF files with Bevy's asset system in WASM, you may encounter these errors:

```
Failed to deserialize meta for asset program-parts/robot/body/box.gltf#Scene0: 
Failed to deserialize minimal asset meta: SpannedError { 
  code: ExpectedNamedStructLike("AssetMetaMinimal"), 
  position: Position { line: 1, col: 1 } 
}
```

**Root Cause**: Bevy's asset system tries to fetch `.meta` files for every GLTF asset. When these files don't exist, the web server may return HTML error pages instead of clean 404s, causing deserialization failures.

**Solution**: Use a service worker to intercept `.meta` requests and return proper 404 responses, allowing Bevy to gracefully fall back to loading raw GLTF files.

## Architecture Overview

```
Frontend (TypeScript) → WASM (Rust/Bevy) → GLTF Assets
        ↓                    ↓                ↓
   ProgramBuilder      ProgramPartName    /assets/program-parts/
```

## File Structure Requirements

### 1. GLTF Assets Directory Structure

```
/front-end/web-app/public/assets/program-parts/
├── robot/
│   ├── body/
│   │   ├── box.gltf
│   │   └── round.gltf
│   ├── head/
│   │   ├── box.gltf
│   │   ├── pyramid.gltf
│   │   └── sphere.gltf
│   ├── eye/
│   │   ├── camera.gltf
│   │   ├── feeler.gltf
│   │   └── sleek_camera.gltf
│   ├── addon/
│   │   └── antenna.gltf
│   └── leg/
│       ├── base/
│       │   ├── hexagonal.gltf
│       │   └── crowned.gltf
│       ├── tibia/
│       │   ├── side.gltf
│       │   ├── straight.gltf
│       │   └── middle.gltf
│       ├── joint/
│       │   ├── cross.gltf
│       │   ├── hexagonal.gltf
│       │   └── star.gltf
│       └── end/
│           └── side.gltf
└── virus-generic-base.gltf
```

### 2. Service Worker Configuration

The service worker (`/public/model-worker.js`) must intercept program parts requests:

```javascript
if (path.includes('/models/drive.gltf') || path.includes('/program-parts/')) {
  console.log(`[Model Worker] Intercepting model request for: ${path}`);

  if (path.endsWith('.meta')) {
    console.log(`[Model Worker] Intentionally blocking .meta request for: ${path}`);
    event.respondWith(
      new Response('Blocked by service worker to test default loading', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/plain' },
      })
    );
    return;
  }
  // ... handle GLTF and .bin files
}
```

## Code Integration Steps

### 1. Update ProgramPartName Enum

In `/src/components/ProgramDatabase.tsx`, ensure the enum matches Rust exactly:

```typescript
enum ProgramPartName {
    Empty = "Empty",
    // Robot Body
    BoxRobotBody = "BoxRobotBody",
    RoundRobotBody = "RoundRobotBody",
    // Robot Head
    BoxRobotHead = "BoxRobotHead",
    PyramidRobotHead = "PyramidRobotHead",
    SphereRobotHead = "SphereRobotHead",
    // Robot Eye
    CameraRobotEye = "CameraRobotEye",
    FeelerRobotEye = "FeelerRobotEye",
    SleekCameraRobotEye = "SleekCameraRobotEye",
    // Robot Addon
    AntennaRobotAddon = "AntennaRobotAddon",
    // Robot Leg Base
    HexagonalRobotLegBase = "HexagonalRobotLegBase",
    CrownedRobotLegBase = "CrownedRobotLegBase",
    // Robot Leg Tibia
    StraightRobotLegTibia = "StraightRobotLegTibia",
    MiddleRobotLegTibia = "MiddleRobotLegTibia",
    SideRobotLegTibia = "SideRobotLegTibia",
    // Robot Leg Joint
    HexagonalRobotLegJoint = "HexagonalRobotLegJoint",
    CrossRobotLegJoint = "CrossRobotLegJoint",
    StarRobotLegJoint = "StarRobotLegJoint",
    // Robot Leg End
    SideRobotLegEnd = "SideRobotLegEnd",
}
```

### 2. Update Part Name Mapping

```typescript
function mapPartNameToEnum(name: string): ProgramPartName {
    switch (name) {
        case "BoxRobotBody": return ProgramPartName.BoxRobotBody;
        case "RoundRobotBody": return ProgramPartName.RoundRobotBody;
        case "BoxRobotHead": return ProgramPartName.BoxRobotHead;
        case "PyramidRobotHead": return ProgramPartName.PyramidRobotHead;
        case "SphereRobotHead": return ProgramPartName.SphereRobotHead;
        case "CameraRobotEye": return ProgramPartName.CameraRobotEye;
        case "FeelerRobotEye": return ProgramPartName.FeelerRobotEye;
        case "SleekCameraRobotEye": return ProgramPartName.SleekCameraRobotEye;
        case "AntennaRobotAddon": return ProgramPartName.AntennaRobotAddon;
        case "HexagonalRobotLegBase": return ProgramPartName.HexagonalRobotLegBase;
        case "CrownedRobotLegBase": return ProgramPartName.CrownedRobotLegBase;
        case "StraightRobotLegTibia": return ProgramPartName.StraightRobotLegTibia;
        case "MiddleRobotLegTibia": return ProgramPartName.MiddleRobotLegTibia;
        case "SideRobotLegTibia": return ProgramPartName.SideRobotLegTibia;
        case "HexagonalRobotLegJoint": return ProgramPartName.HexagonalRobotLegJoint;
        case "CrossRobotLegJoint": return ProgramPartName.CrossRobotLegJoint;
        case "StarRobotLegJoint": return ProgramPartName.StarRobotLegJoint;
        case "SideRobotLegEnd": return ProgramPartName.SideRobotLegEnd;
        default:
            // Fallback for backwards compatibility
            const lowerName = name.toLowerCase();
            if (lowerName.includes('body')) return ProgramPartName.SimpleBody;
            if (lowerName.includes('eye')) return ProgramPartName.SimpleEye;
            if (lowerName.includes('limb')) return ProgramPartName.SimpleLimb;
            return ProgramPartName.Empty;
    }
}
```

### 3. Create Proper Data Structure

For testing or manual programs, use this structure:

```typescript
const testProgram: Program = {
    id: "test_gltf_program",
    suiObjectId: "test_gltf_program",
    name: "Test GLTF Robot",
    protocol: "Test",
    source: "Test",
    type: "Test / Digital",
    speed: 5,
    corruption: 25,
    maxHealth: 100,
    health: 100,
    damage: 15,
    mintDate: "Test",
    viewModel: {
        palette: {
            primary: [78, 127, 249],
            secondary: [93, 221, 101],
            tertiary: [136, 105, 220],
            highlight: [78, 54, 207],
            accent: [258, 86, 170]
        },
        addons: []
    },
    rawFields: {
        id: { id: "test_gltf_program" },
        protocol: "Test",
        version: { number: 1 },
        generated_on: { number: 1 },
        palette: {
            primary: { type: "SuiMiniColor", fields: { hue: 78, saturation: 127, value: 249 } },
            accent: { type: "SuiMiniColor", fields: { hue: 93, saturation: 221, value: 101 } },
            highlight: { type: "SuiMiniColor", fields: { hue: 136, saturation: 105, value: 220 } },
            neutral: { type: "SuiMiniColor", fields: { hue: 78, saturation: 54, value: 207 } },
            background: { type: "SuiMiniColor", fields: { hue: 258, saturation: 86, value: 170 } }
        },
        parts: [
            { name: "BoxRobotBody", params: [] },
            { name: "SphereRobotHead", params: [] },
            { name: "CameraRobotEye", params: [] },
            { name: "AntennaRobotAddon", params: [] },
            { name: "HexagonalRobotLegBase", params: [] },
            { name: "SideRobotLegTibia", params: [] },
            { name: "SideRobotLegEnd", params: [] },
            { name: "CrossRobotLegJoint", params: [] }
        ]
    }
};
```

## Adding New GLTF Parts

### 1. Add the GLTF File

Place the `.gltf` file in the appropriate directory under `/public/assets/program-parts/`

### 2. Update Rust Enum

In `/packages/program/src/parts/mod.rs`, add the new part to the `ProgramPartName` enum:

```rust
#[derive(Serialize, Deserialize, Copy, Clone)]
pub enum ProgramPartName {
    // ... existing parts
    NewRobotPart,  // Add your new part here
}
```

### 3. Update Rust Implementation

Add the implementation in the `ProgramPartBuilder::build` match statement:

```rust
ProgramPartName::NewRobotPart => {
    NewRobotPart::build(&self.params, from, skeleton, palette, bindposes)
}
```

### 4. Update TypeScript Enum

Add the part to the TypeScript enum in `ProgramDatabase.tsx`:

```typescript
enum ProgramPartName {
    // ... existing parts
    NewRobotPart = "NewRobotPart",
}
```

### 5. Update Mapping Function

Add the mapping in `mapPartNameToEnum`:

```typescript
case "NewRobotPart": return ProgramPartName.NewRobotPart;
```

## Naming Conventions

### GLTF File Naming

- File names should be descriptive and lowercase with underscores: `sphere_head.gltf`
- Directory structure should group by part type: `robot/head/`, `robot/body/`, etc.

### Rust Enum Naming

- Use PascalCase: `SphereRobotHead`
- Include the category: `RobotHead`, `RobotBody`, `RobotEye`
- Be specific: `BoxRobotBody` vs `RoundRobotBody`

### TypeScript Enum Naming

- Must exactly match Rust enum values
- Use same PascalCase convention

## Data Flow

```
1. SUI Blockchain Data → rawFields.parts: [{ name: "BoxRobotBody", params: [] }]
2. TypeScript Mapping → ProgramPartName.BoxRobotBody
3. WASM Event → { ViewModel: { parts: [{ name: "BoxRobotBody", params: [] }] } }
4. Rust Processing → ProgramPartBuilder with ProgramPartName::BoxRobotBody
5. Asset Loading → /assets/program-parts/robot/body/box.gltf
6. Service Worker → Intercepts .meta requests, returns 404
7. Bevy Asset System → Loads GLTF successfully
```

## Troubleshooting

### Issue: "Failed to deserialize meta" errors

**Solution**: Verify service worker is intercepting `/program-parts/` requests and blocking `.meta` files.

**Check**: Console should show:
```
[Model Worker] Intercepting model request for: /assets/program-parts/robot/body/box.gltf
[Model Worker] Intentionally blocking .meta request for: /assets/program-parts/robot/body/box.gltf.meta
```

### Issue: Parts have `undefined` names

**Solution**: Ensure `rawFields.parts` contains proper objects with `name` and `params` properties.

**Check**: 
- SUI data structure is correct
- `transformRawPartsForWasm` function receives valid data
- Part names match exactly between TypeScript and Rust enums

### Issue: GLTF files not loading

**Solution**: 
1. Verify files exist in `/public/assets/program-parts/`
2. Check service worker is registered and active
3. Ensure file paths match exactly

**Check**:
```bash
find front-end/web-app/public/assets/program-parts -name "*.gltf"
```

### Issue: Service worker not working

**Solution**: 
1. Check registration in browser DevTools → Application → Service Workers
2. Force refresh (Ctrl+Shift+R) to update service worker
3. Verify scope is set to `/`

### Issue: Wrong part names in console

**Solution**: Update `mapPartNameToEnum` function to include all new parts.

**Check**: Console logs showing `Part at index X has invalid or missing name: undefined`

## Testing Your Integration

### 1. Add a Test Program

Add a hardcoded test program to the programs list to verify parts work:

```typescript
// In fetchProgramsFromWallet function, add before setPrograms():
const testProgram = { /* structure from above */ };
fetchedProgramData.unshift(testProgram);
```

### 2. Monitor Console Logs

Look for these success indicators:
- `[Model Worker] Intercepting model request for:` - Service worker is working
- `[Model Worker] Intentionally blocking .meta request for:` - Meta files are blocked
- No "Failed to deserialize meta" errors
- WASM successfully receives ViewModel events

### 3. Check Browser DevTools

- **Network tab**: Should show 404s for `.meta` files, 200s for `.gltf` files
- **Application tab**: Service worker should be active with `/` scope
- **Console**: No Bevy asset loading errors

## Performance Considerations

- Service worker caches GLTF files for better performance
- Preload critical assets in `preload-assets.js` if needed
- Use efficient GLTF files (compressed, optimized meshes)
- Monitor asset loading times in Network tab

## Best Practices

1. **Always test with a hardcoded program first** before debugging SUI data issues
2. **Keep enum names synchronized** between Rust and TypeScript
3. **Use descriptive file and enum names** for maintainability
4. **Monitor console logs** during development
5. **Test service worker updates** with hard refresh when making changes
6. **Validate GLTF files** before adding to ensure they're valid
7. **Document new parts** when adding them to the system

This guide should prevent the headaches encountered during initial GLTF integration. Follow it step-by-step for reliable 3D asset loading in the WASM environment.

## Critical GLTF Format Requirements

⚠️ **IMPORTANT**: Not all GLTF files are compatible with the current Bevy WebGPU setup. Based on extensive testing:

### ✅ Compatible GLTF Format
- **External binary files** (separate `.bin` files)
- **External textures** (separate `.png`, `.jpg` files) 
- **Simple material structures**
- **Example**: The working `drive.gltf` model uses this format

### ❌ Incompatible GLTF Format  
- **Embedded base64 data** in the GLTF file itself
- **Inline textures** using `data:image/png;base64,` URIs
- **Complex embedded materials**
- **Example**: Current robot parts use this format and cause black screens

### Why This Matters
The robot GLTF files currently use embedded base64 data like:
```json
"images":[{"mimeType":"image/png","uri":"data:image/png;base64,iVBORw0KGgo..."}]
```

This format creates additional uniform buffers in the WebGPU rendering pipeline, causing it to exceed the 12-buffer limit and resulting in black screens.

## Comprehensive Troubleshooting Guide

### Issue: Black Screen with GLTF Parts

**Symptoms:**
- Legacy parts (SimpleBody, SimpleEye, etc.) render correctly
- ANY GLTF part (even replacing just one Empty part) causes black screen
- Console shows WebGPU uniform buffer errors
- Service worker successfully loads GLTF files
- No "Failed to deserialize meta" errors

**Root Cause:**
GLTF format incompatibility with Bevy WebGPU renderer, specifically embedded base64 data.

**Testing Steps to Confirm:**
1. Create isolated test with only legacy parts → Should work
2. Replace ONE Empty part with GLTF part → Black screen confirms GLTF issue
3. Check GLTF file format → Look for `data:image/` or `data:application/` URIs

**Resolution:**
Replace GLTF files with external-file format or use legacy parts until GLTF files are updated.

### Issue: WebGPU Uniform Buffer Limit

**Symptoms:**
```
The number of uniform buffers (13) in the Fragment stage exceeds the maximum per-stage limit (12).
[Invalid PipelineLayout (unlabeled)] is invalid.
```

**Root Cause:**
- 4 shadow-casting lights (from Rust lighting setup)
- Multiple GLTF materials with embedded textures
- Bevy's PBR material system
- Total exceeds WebGPU's 12 uniform buffer limit

**Note:** This is a secondary issue. Even with 1 GLTF part, embedded base64 data causes problems.

### Issue: "Failed to deserialize meta" (RESOLVED)

This was the original issue that led to the service worker solution. It's now working correctly:

**Expected Behavior:**
- Service worker blocks `.meta` requests with 404s
- Bevy gracefully falls back to raw GLTF loading
- Console shows `[Model Worker] Intentionally blocking .meta request`

**If Still Occurring:**
- Check service worker registration in DevTools → Application → Service Workers
- Force refresh (Ctrl+Shift+R) to update service worker
- Verify service worker scope is set to `/`

### Issue: GLTF Files Not Loading

**Check Asset Path Structure:**
```
Rust code requests: "program-parts/robot/body/box.gltf"
Bevy automatically prepends: "/assets/"
Final request: "/assets/program-parts/robot/body/box.gltf"
Files must be located: front-end/web-app/public/assets/program-parts/...
```

**Verification:**
- Console shows `[Model Worker] Intercepting model request for: /assets/program-parts/...`
- Console shows `[Model Worker] Serving /assets/program-parts/... from cache`
- Network tab shows 200 responses for .gltf files, 404 for .meta files

## Testing Methodology

### 1. Test Legacy Parts First
Always verify the rendering pipeline works with known-good parts:

```typescript
const legacyParts = [
    { name: ProgramPartName.SimpleBody, params: [4, 5, 50, 40, 20, 85] },
    { name: ProgramPartName.SimpleEye, params: [] },
    { name: ProgramPartName.SimpleLimb, params: [2] },
    { name: ProgramPartName.Empty, params: [] },
    { name: ProgramPartName.Empty, params: [] }
];
```

If these don't render, the issue is with the WASM setup, not GLTF integration.

### 2. Test Minimal GLTF Integration
Replace only ONE Empty part with a GLTF part while keeping the core structure:

```typescript
const minimalGltfTest = [
    { name: ProgramPartName.SimpleBody, params: [4, 5, 50, 40, 20, 85] },
    { name: ProgramPartName.SimpleEye, params: [] },
    { name: ProgramPartName.SimpleLimb, params: [2] },
    { name: ProgramPartName.BoxRobotBody, params: [] }, // GLTF part
    { name: ProgramPartName.Empty, params: [] }
];
```

If this causes black screen, the issue is GLTF format compatibility.

### 3. Use Isolated Testing Environment
Use ProgramEventDemo component for clean testing without SUI blockchain interference:

```typescript
// In ProgramEventDemo.tsx
const parts = [/* test configuration */];
```

This provides isolated console output and eliminates variables.

## Integration Status Verification

### ✅ GLTF Integration Working Correctly:
- [x] Service worker intercepts GLTF requests
- [x] Files served successfully (200 responses)
- [x] Meta files blocked correctly (404 responses) 
- [x] Data transformation working (SUI → TypeScript → WASM)
- [x] Rust code has GLTF part implementations
- [x] Asset paths resolve correctly
- [x] No "Failed to deserialize meta" errors

### ❌ GLTF Rendering Blocked By:
- [ ] Embedded base64 format in current GLTF files
- [ ] WebGPU uniform buffer limitations with complex materials
- [ ] Bevy PBR material system incompatibility

## Current Workaround

Until GLTF files are updated to use external binary format:

1. **Use legacy parts** for reliable rendering
2. **Test GLTF integration** with ProgramEventDemo to confirm frontend components work
3. **Monitor console** for service worker success messages
4. **Document GLTF format requirements** for content creators

## Future GLTF Requirements

For GLTF files to work with the current system:

1. **Export with external files**:
   - Separate `.bin` file for binary data
   - Separate image files (`.png`, `.jpg`)
   - No embedded base64 data

2. **Simple material structure**:
   - Minimal PBR materials
   - Avoid complex texture setups
   - Keep uniform buffer usage low

3. **Test with single part** before creating full programs

4. **Validate in isolation** using ProgramEventDemo

This ensures compatibility with Bevy's WebGPU rendering pipeline while maintaining the service worker integration benefits.