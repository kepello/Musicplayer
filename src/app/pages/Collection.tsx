import { AlbumsList } from '@/app/components/AlbumsList';

export function Collection() {
  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <AlbumsList />
      </div>
    </div>
  );
}
