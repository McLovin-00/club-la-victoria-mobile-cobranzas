import { useContext } from 'react';
import { ConfirmContext } from '../contexts/confirmContext';

export const useConfirmDialog = () => useContext(ConfirmContext);


