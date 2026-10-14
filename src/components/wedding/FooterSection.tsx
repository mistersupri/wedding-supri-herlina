import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitationData } from '../../types.js';

interface FooterSectionProps {
  invitation: InvitationData;
  isAuthenticated: boolean;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  invitation,
  isAuthenticated,
}) => {
  const { styles } = useTheme();

  return (
    <footer
      className="py-16 px-4 text-center border-t relative overflow-hidden"
      style={{ borderColor: styles.borderAccent, backgroundColor: styles.bgPrimary }}
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        {/* Subtitle */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3 h-3" style={{ color: styles.accent }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans"
            style={{ color: styles.textSecondary }}
          >
            Ungkapan Terima Kasih
          </span>
          <Sparkles className="w-3 h-3" style={{ color: styles.accent }} />
        </div>

        <p className="text-sm text-[#78786A] max-w-xl mx-auto leading-relaxed mb-6">
          Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir
          untuk memberikan doa restu kepada kami berdua.
        </p>

        <h3 className="font-['Alex_Brush'] text-5xl sm:text-6xl my-2" style={{ color: styles.accent }}>
          {invitation.groomShortName} & {invitation.brideShortName}
        </h3>

        <div className="flex items-center justify-center gap-1 text-xs text-[#78786A] mt-6">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          <span>for our sacred wedding day</span>
        </div>
      </div>
    </footer>
  );
};
