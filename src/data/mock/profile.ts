import { ProfileMenuSection } from '@/types/ui';

export const mockUser = {
  name: 'Ahmed Khan',
  email: 'ahmed.khan@example.com',
  role: 'Customer',
  company: 'Khan Trading Co.',
  avatarInitials: 'AK',
};

export const mockProfileSections: ProfileMenuSection[] = [
  {
    title: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
      { id: 'documents', label: 'Documents', icon: 'folder-outline' },
      { id: 'security', label: 'Security & password', icon: 'shield-checkmark-outline' },
    ],
  },
  {
    title: 'Help',
    items: [
      { id: 'support', label: 'Support', icon: 'headset-outline' },
    ],
  },
];
