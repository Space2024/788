'use client';

import React, { memo, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, AlertCircle, } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LocationData {
  locationName: string;
  ip: string;
}

interface QRData {
  url: string;
  ecno: string;
  encodedEcno: string;
  referenceCode: string;
  timestamp: string;
  sessionId: string;
  location?: LocationData;
}

interface SecureQRGeneratorProps {
  ecno: string;
  onError?: (error: string) => void;
  onSuccess?: (qrData: QRData) => void;
  onExpire?: () => void;
  locationData?: LocationData | null;
  startTimer: boolean;
}

const SecureQRGenerator = memo(
  ({ ecno, onError, onSuccess, onExpire, locationData, startTimer }: SecureQRGeneratorProps) => {
    const [timeLeft, setTimeLeft] = useState(90);
    const [qrData, setQrData] = useState<{
      url: string;
      referenceCode: string;
      ecno: string;
      encodedEcno: string;
      location?: LocationData | null;
    } | null>(null);

    // Function to encode string multiple times in base64
    const encodeMultipleTimes = (text: string, times: number): string => {
      let encoded = text;
      try {
        for (let i = 0; i < times; i++) {
          encoded = btoa(encodeURIComponent(encoded));
        }
        return encoded;
      } catch (error) {
        console.error('Encoding error:', error);
        throw new Error('Failed to encode ECNO');
      }
    };

    // Function to generate secure random string
    const generateSecureRandomString = (): string => {
      const array = new Uint32Array(4);
      crypto.getRandomValues(array);
      return Array.from(array, (x) => x.toString(36))
        .join('')
        .slice(0, 8);
    };

    // Move QR data generation to useEffect
    useEffect(() => {
      const generateAndSetQRData = () => {
        try {
          // Generate a 6-digit reference code
          const referenceCode = Math.floor(
            100000 + Math.random() * 900000
          ).toString();

          // Encode ECNO 5 times in base64
          const encodedEcno = encodeMultipleTimes(ecno, 5);

          // Generate secure session ID
          const randomString = generateSecureRandomString();
          const sessionId = `${ecno}-${Date.now()}-${randomString}`;

          // Create verification URL with encoded ECNO
          const verificationUrl = `https://qrcode-ten-lac.vercel.app/${encodedEcno}/${referenceCode}`;

          const newQrData = {
            url: verificationUrl,
            ecno,
            encodedEcno,
            referenceCode,
            sessionId,
            timestamp: new Date().toISOString(),
            location: locationData || undefined,
          };

          setQrData({
            url: verificationUrl,
            referenceCode,
            ecno,
            encodedEcno,
            location: locationData,
          });

          onSuccess?.(newQrData);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          onError?.('Failed to generate secure QR code');
          setQrData(null);
        }
      };

      generateAndSetQRData();
    }, [ecno, locationData, onError, onSuccess]);

    // Timer effect
    useEffect(() => {
      let timer: NodeJS.Timeout;
      
      if (startTimer && qrData) {
        setTimeLeft(90);
        timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              onExpire?.();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    }, [startTimer, qrData, onExpire]);

    if (!qrData) {
      return (
        <div className="w-full">
          <Alert className="border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>
              Please try regenerating the QR code
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center space-y-4">
        {/* <div className="w-full">
          <Alert className="mb-4 border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Verified QR Code</AlertTitle>
            <AlertDescription className="mt-1">
              <div>ECNO: {ecno}</div>
              <div className="text-sm text-gray-600">
                Reference: {qrData.referenceCode}
              </div>
              {qrData.location && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {qrData.location.locationName}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div> */}

        <div className="relative">
          <QRCodeSVG value={qrData.url} size={200} />
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow border">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Scan to verify</p>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 break-all font-mono">
              {qrData.url}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

SecureQRGenerator.displayName = 'SecureQRGenerator';

export default SecureQRGenerator;