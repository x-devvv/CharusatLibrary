import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import {
  IconArrowLeft,
  IconSettings,
  IconUserBolt,
  IconBook,
  IconUsers,
  IconBookmark,
  IconHistory,
  IconLogout,
} from "@tabler/icons-react";

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      const { logout: apiLogout } = await import('../lib/api')
      await apiLogout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    logout(); // Use context logout method
    navigate("/");
  };

  // Build links based on user role
  const links = [];

  // Common links for all authenticated users
  if (user) {
    links.push(
      {
        label: "Books",
        href: "/books",
        icon: <IconBook className="text-gray-200 h-5 w-5 flex-shrink-0" />,
      }
    );

    // Member and Student-specific links
    if (user.role === 'member' || user.role === 'student') {
      links.push(
        {
          label: "My Transactions",
          href: "/transactions",
          icon: <IconHistory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Reservations",
          href: "/reservations",
          icon: <IconBookmark className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        }
      );
    }

    // Librarian-specific links
    if (user.role === 'librarian') {
      links.push(
        {
          label: "Manage Books",
          href: "/admin/books",
          icon: <IconBook className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Transactions",
          href: "/admin/transactions",
          icon: <IconHistory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Reservations",
          href: "/admin/reservations",
          icon: <IconBookmark className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
      );
    }

    // Admin-specific links (admin has access to everything)
    if (user.role === 'admin') {
      links.push(
        {
          label: "Manage Books",
          href: "/admin/books",
          icon: <IconBook className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Transactions",
          href: "/admin/transactions",
          icon: <IconHistory className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Reservations",
          href: "/admin/reservations",
          icon: <IconBookmark className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        },
        {
          label: "Manage Users",
          href: "/admin/users",
          icon: <IconUsers className="text-gray-200 h-5 w-5 flex-shrink-0" />,
        }
      );
    }

    // Profile link for all users
    links.push({
      label: "Profile",
      href: "/profile",
      icon: <IconUserBolt className="text-gray-200 h-5 w-5 flex-shrink-0" />,
    });
  }

  return (
    <div className="flex flex-col md:flex-row w-full flex-1 overflow-hidden h-screen">
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => {
                const isActive = location.pathname === link.href || 
                  (link.href.startsWith('/admin') && location.pathname.startsWith('/admin') && 
                   location.pathname.includes(link.href.split('/').pop()));
                return (
                  <Link key={idx} to={link.href} className="no-underline">
                    <SidebarLink link={link} isActive={isActive} />
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 group/sidebar py-3 px-3 cursor-pointer hover:bg-red-900/30 rounded-lg transition-all duration-200 text-gray-200 hover:text-red-400 w-full justify-start"
              >
                <div className="flex-shrink-0 flex items-center justify-center">
                  <IconLogout className="text-gray-200 h-5 w-5 group-hover:text-red-400" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                  Logout
                </span>
              </button>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/profile" className="no-underline">
              <div className={cn(
                "flex items-center gap-3 group/sidebar py-3 px-3 cursor-pointer rounded-lg transition-all duration-200 border",
                location.pathname === '/profile' 
                  ? "bg-blue-600/20 border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10" 
                  : "hover:bg-blue-900/30 border-gray-700/50 bg-gray-800/30"
              )}>
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0D8ABC&color=fff`}
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {(user?.name || "User").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    location.pathname === '/profile' ? "text-blue-300" : "text-white"
                  )}>
                    {user?.name || "User"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={
                        user?.role === 'admin' ? 'destructive' :
                        user?.role === 'librarian' ? 'warning' :
                        user?.role === 'member' ? 'success' : 'secondary'
                      }
                      className="text-xs px-2 py-0"
                    >
                      {user?.role || 'User'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 overflow-hidden">
        <div className="border-l border-gray-800/50 bg-gradient-to-br from-[#020617]/40 to-[#020617]/60 backdrop-blur-md flex flex-col flex-1 w-full h-full overflow-y-auto min-w-0">
          <div className="p-8 min-w-[800px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="mb-2"
    >
      <Link to="/books" className="block hover:bg-gray-700/30 rounded-xl transition-all duration-200 group">
        <div className="flex items-center justify-center">
          <div className="relative">
            <img 
              src="/app/logo.png" 
              alt="CHARUSAT" 
              className="h-48 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export const LogoIcon = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="mb-2"
    >
      <Link to="/books" className="block hover:bg-gray-700/30 rounded-xl transition-all duration-200 group">
        <div className="flex items-center justify-center">
          <div className="relative">
            <img 
              src="/app/logo.png" 
              alt="CHARUSAT" 
              className="h-28 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};