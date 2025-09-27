import React, { useState, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SidebarContext = createContext(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({ children, open: openProp, setOpen: setOpenProp, animate = true }) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({ children, open, setOpen, animate }) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props)} />
    </>
  );
};

export const DesktopSidebar = ({ className, children, ...props }) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-[#020617]/90 backdrop-blur-md border-r border-gray-800 w-[300px] flex-shrink-0",
          className
        )}
        animate={{
          width: animate ? (open ? "300px" : "80px") : "300px",
        }}
        onMouseEnter={() => animate && setOpen(true)}
        onMouseLeave={() => animate && setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({ className, children, ...props }) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-[#020617]/90 backdrop-blur-md border-b border-gray-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <button
            onClick={() => setOpen(!open)}
            className="text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              "fixed h-full w-full inset-0 bg-[#020617]/95 backdrop-blur-md p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-gray-200"
              onClick={() => setOpen(!open)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            {children}
          </motion.div>
        )}
      </div>
    </>
  );
};

export const SidebarLink = ({ link, isActive = false, className, ...props }) => {
  const { open, animate } = useSidebar();
  return (
    <div
      className={cn(
        "flex items-center gap-3 group/sidebar py-3 px-3 cursor-pointer rounded-lg transition-all duration-200 justify-start",
        isActive 
          ? "bg-blue-600/20 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10" 
          : "hover:bg-gray-800/50 text-gray-200",
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0 flex items-center justify-center">
        {React.cloneElement(link.icon, {
          className: cn(
            link.icon.props.className,
            isActive ? "text-blue-400" : "text-gray-200 group-hover:text-gray-100"
          )
        })}
      </div>

      <span className={cn(
        "text-sm font-medium whitespace-nowrap",
        isActive ? "text-blue-300" : "text-gray-200 group-hover:text-gray-100"
      )}>
        {link.label}
      </span>
    </div>
  );
};
