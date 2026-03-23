import { useAuth } from '../../hooks/useAuth.js';
import styles from './UserMenu.module.css';

export default function UserMenu() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className={styles.container}>
            <div className={styles.userInfo}>
                {user.picture && (
                    <img src={user.picture} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
                )}
                <div className={styles.details}>
                    <span className={styles.name}>{user.name}</span>
                    <span className={styles.email}>{user.email}</span>
                </div>
            </div>
            <a href="/auth/logout" className={styles.logout}>Sign out</a>
        </div>
    );
}
