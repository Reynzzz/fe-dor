import img1jt from "../assets/New_Hadiah/1JT KOIN (seragam).png";
import img700rb from "../assets/New_Hadiah/700RB KOIN (seragam).png";
import img500rb from "../assets/New_Hadiah/500RB KOIN (seragam).png";

export interface Prize {
  id: number;
  name: string;
  amountLabel: string;
  image: string; // gambar judul hadiah (sudah memuat nominal + jumlah pemenang)
  quantity: number;
  color: string;
  glowColor: string;
}

export interface Participant {
  id: string; // id database peserta
  name: string;
  region: string;
}

export const PRIZES: Prize[] = [
  {
    id: 1,
    name: "UANG TUNAI",
    amountLabel: "Rp 1.000.000",
    image: img1jt,
    quantity: 10,
    color: "#FFFFFF",
    glowColor: "rgba(255, 255, 255, 0.6)",
  },
  {
    id: 2,
    name: "UANG TUNAI",
    amountLabel: "Rp 700.000",
    image: img700rb,
    quantity: 10,
    color: "#FFFFFF",
    glowColor: "rgba(255, 255, 255, 0.6)",
  },
  {
    id: 3,
    name: "UANG TUNAI",
    amountLabel: "Rp 500.000",
    image: img500rb,
    quantity: 6,
    color: "#FFFFFF",
    glowColor: "rgba(255, 255, 255, 0.6)",
  },
];
