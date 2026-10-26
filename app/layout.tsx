import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Vía Cotone · Rutas',description:'Planificación de retiros, entregas y camionetas',icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-AR"><body>{children}</body></html>}
