import { User, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
}

interface GuestDetailsFormProps {
  guestDetails: GuestDetails;
  onGuestDetailsChange: (details: GuestDetails) => void;
}

const GuestDetailsForm = ({ guestDetails, onGuestDetailsChange }: GuestDetailsFormProps) => {
  const handleChange = (field: keyof GuestDetails, value: string) => {
    onGuestDetailsChange({
      ...guestDetails,
      [field]: value
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-wave-orange/20">
      <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        👤 Your Details
        <span className="text-sm font-normal text-muted-foreground">(Required)</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="guest-name" className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4 text-wave-orange" />
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="guest-name"
            type="text"
            placeholder="Your full name"
            value={guestDetails.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="border-wave-orange/30 focus:border-wave-orange focus:ring-wave-orange/20"
            maxLength={100}
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="guest-email" className="flex items-center gap-2 text-sm font-medium">
            <Mail className="w-4 h-4 text-wave-orange" />
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="guest-email"
            type="email"
            placeholder="your@email.com"
            value={guestDetails.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="border-wave-orange/30 focus:border-wave-orange focus:ring-wave-orange/20"
            maxLength={255}
            required
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="guest-phone" className="flex items-center gap-2 text-sm font-medium">
            <Phone className="w-4 h-4 text-wave-orange" />
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="guest-phone"
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            value={guestDetails.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="border-wave-orange/30 focus:border-wave-orange focus:ring-wave-orange/20"
            maxLength={15}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default GuestDetailsForm;
