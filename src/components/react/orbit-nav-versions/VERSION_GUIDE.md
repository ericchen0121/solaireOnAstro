# OrbitNav Version Management

## Quick Start

**To switch between versions**, edit this file:
```
src/components/react/orbit-nav-config.ts
```

Change the `ACTIVE_VERSION` constant:

```typescript
// Use V1 (original with text labels)
export const ACTIVE_VERSION: OrbitNavVersion = 'v1';

// Use V2 (simplified, no text labels)  
export const ACTIVE_VERSION: OrbitNavVersion = 'v2';
```

## File Structure

```
src/components/react/
├── OrbitNav.tsx                    # 👈 Main file (auto-loads active version)
├── orbit-nav-config.ts             # 👈 Version switcher
│
└── orbit-nav-versions/
    ├── VERSION_GUIDE.md            # 👈 This file
    │
    ├── v1/                         # 📁 Original version (archived)
    │   ├── OrbitNav_v1.tsx         # Full-featured with text labels
    │   └── README_v1.md            # V1 documentation
    │
    └── v2/                         # 📁 New simplified version  
        ├── OrbitNav_v2.tsx         # No text labels, ready for new animation
        └── README_v2.md            # V2 documentation
```

## Version Comparison

| Feature | V1 (Archived) | V2 (Development) |
|---------|---------------|------------------|
| **Orbital Motion** | ✅ | ✅ |
| **Color Inversion** | ✅ | ✅ |  
| **Route Text Labels** | ✅ | ❌ |
| **Hover Effects** | ✅ Complex | ✅ Simple |
| **ScrollTrigger** | ✅ | ✅ |
| **Debug Mode** | ✅ | ✅ |
| **New Animation** | ❌ | 🚧 Ready |

## How It Works

1. **`OrbitNav.tsx`** imports the active version from `orbit-nav-config.ts`
2. **Layouts** continue using `OrbitNav.tsx` (no changes needed)
3. **Version switching** is transparent to the rest of the app
4. **Both versions** are preserved and can be activated instantly

## Development Workflow

### Working on V2
1. Set `ACTIVE_VERSION = 'v2'` in config
2. Edit `orbit-nav-versions/v2/OrbitNav_v2.tsx`
3. Test your changes
4. Commit incrementally

### Testing V1 vs V2
1. Switch `ACTIVE_VERSION` in config
2. Refresh browser to see changes
3. Compare behavior/appearance
4. No need to change layout files

### Reverting to V1
1. Set `ACTIVE_VERSION = 'v1'` in config
2. V1 is fully preserved and ready to use
3. All original functionality intact

## Adding New Versions

To add V3 in the future:

1. **Create folder**: `orbit-nav-versions/v3/`
2. **Add component**: `OrbitNav_v3.tsx`  
3. **Update config**: Add `v3` to `OrbitNavVersion` type
4. **Update router**: Add `v3` to `VERSION_COMPONENTS`

## Console Debugging

The active version is logged to console:
```
🎯 OrbitNav Version: v2 { active: 'v2', description: '...', features: [...] }
```

## Notes

- **No breaking changes**: External API remains the same
- **Instant switching**: Change config → refresh page
- **Version isolation**: Changes to one version don't affect others
- **Preserve history**: V1 remains untouched as a backup
- **Easy rollback**: Always possible to revert to any version