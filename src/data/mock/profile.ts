import { ProfileMenuSection } from '@/types/ui';

export const mockUser = {
  name: 'Sarah Chen',
  email: 'sarah.chen@logistix.io',
  role: 'Operations Manager',
  company: 'Logistix Corp',
  avatarInitials: 'SC',
};

export const mockProfileSections: ProfileMenuSection[] = [
  {
    title: 'Account',
    items: [
      { id: '1', label: 'Personal Information', icon: 'person-outline' },
      { id: '2', label: 'Company Details', icon: 'business-outline' },
      { id: '3', label: 'Team Members', icon: 'people-outline', badge: '12' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: '4', label: 'Notifications', icon: 'notifications-outline' },
      { id: '5', label: 'Language & Region', icon: 'globe-outline' },
      { id: '6', label: 'Appearance', icon: 'moon-outline' },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: '7', label: 'Help Center', icon: 'help-circle-outline' },
      { id: '8', label: 'Contact Support', icon: 'chatbubble-outline' },
      { id: '9', label: 'Terms & Privacy', icon: 'document-outline' },
    ],
  },
];
