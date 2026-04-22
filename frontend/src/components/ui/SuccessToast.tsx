import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import styles from './Feedback.module.css';

type SuccessToastProps = {
  message: string | null;
};

export default function SuccessToast({ message }: SuccessToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          className={styles.toast}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
