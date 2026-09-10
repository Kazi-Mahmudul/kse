// Re-export the platform-correct AvatarPicker. Metro picks
// `.native.tsx` for iOS/Android and `.web.tsx` for the web bundle.
export { AvatarPicker } from './avatar-picker.native';
