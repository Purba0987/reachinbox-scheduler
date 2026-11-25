import React from 'react';
import { GoogleAuthModal } from './GoogleAuthModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  return (
    <GoogleAuthModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      onSuccess={onSuccess || (() => {})}
    />
  );
};
