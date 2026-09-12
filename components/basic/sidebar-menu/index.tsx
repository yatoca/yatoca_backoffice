import React, { useEffect } from 'react'
import './styles.css'
import { LogoWhite } from '@/constants/svgs'
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

const SidebarMenu: React.FC = () => {
    const pathname = usePathname();
    const user = typeof window !== "undefined" ? localStorage.getItem("admin_user") : "";
    const router = useRouter();
    const logout = () => {
        localStorage.removeItem("admin_logged");
        localStorage.removeItem("admin_user");
        router.push("/admin/login");
    }

    useEffect(() => {
        if (!user) {
            logout();
        }
    }, []);

    const menuItems = [
        { href: '/cabildos', name: 'Cabildos' },
        { href: '/murals', name: 'Murales' },
        { href: '/darkroom', name: 'Dark Room' },
        { href: '/radio', name: 'Radio' },
        { href: '/videos', name: 'Videos' },
        // { href: '/dashboard', name: 'Dashboard' },
        // { href: '/topics', name: 'Temas' },
        // { href: '/summary', name: 'Resumen' },
        // { href: '/unprocessed-statements', name: 'Declaraciones pendientes' },
        // { href: '/processed-statements', name: 'Declaraciones procesadas' },
        // { href: '/admin/topics', name: 'Temas predeterminados' },
    ]
    return (
        <div className='sidebar-menu'>
            <div style={{ paddingLeft: 8, paddingTop: 35 }}><LogoWhite /></div>
            <div style={{ height: 68 }} />
            <div className='sidebar-menu-items'>
                {menuItems.map((item, index) => (
                    <Link href={item.href} key={index}>
                        <div className={pathname.includes(item.href) ? 'sidebar-menu-item-active' : 'sidebar-menu-item'}>{item.name}</div>
                    </Link>
                ))}
            </div>
            <div style={{ height: 68 }} />
            <div className='sidebar-menu-item pointer' onClick={() => router.push('/analyses')}>Mis analyses</div>
            <div style={{ height: 10 }} />
            <div className='sidebar-menu-item pointer' onClick={logout}>Cerrar sesión</div>
        </div>
    )
}
export default SidebarMenu