interface BadgeProps {
    label: string;
    variant: "success" | "warning" | "danger" | "neutral" | "info";
}

const variants = {
    success: "bg-primary-100 text-primary-800",
    warning: "bg-bayo-100    text-bayo-800",
    danger: "bg-teja-100    text-teja-700",
    neutral: "bg-gray-100    text-gray-700",
    // Aviso que no implica falla: se lee distinto del ámbar y del rojo
    info: "bg-info-100     text-info-700",
};

export function Badge({ label, variant }: BadgeProps) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                      text-xs font-medium ${variants[variant]}`}>
            {label}
        </span>
    );
}