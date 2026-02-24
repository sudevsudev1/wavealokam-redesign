import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const VALID_IMAGES: Record<string, string> = {
  email_with_Agoda: '/evidence/email_with_Agoda.jpeg',
  room_area_details: '/evidence/room_area_details.jpeg',
  room_without_breakfast_details: '/evidence/room_without_breakfast_details.jpeg',
};

const EvidenceImage = () => {
  const { filename } = useParams<{ filename: string }>();
  const navigate = useNavigate();
  const imagePath = filename ? VALID_IMAGES[filename] : null;

  if (!imagePath) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Wavealokam – Screenshots</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <img
          src={imagePath}
          alt="Evidence screenshot"
          className="max-w-full max-h-screen object-contain"
        />
      </div>
    </>
  );
};

export default EvidenceImage;
