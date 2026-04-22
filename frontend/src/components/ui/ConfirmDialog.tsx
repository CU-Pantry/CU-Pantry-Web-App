import { AnimatePresence, motion } from 'framer-motion';
import styles from './Feedback.module.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
          >
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.text}>{message}</p>
            <div className={styles.actions}>
              <button className={`${styles.button} ${styles.buttonGhost}`} onClick={onCancel} type="button">
                {cancelLabel}
              </button>
              <button className={`${styles.button} ${styles.buttonDanger}`} onClick={onConfirm} type="button">
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
