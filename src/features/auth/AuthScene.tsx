import Image from "next/image";
import { brand } from "@/content/siteContent";
import styles from "./AuthPage.module.css";

// "IUT Lake Auditorium" by Classique53, CC BY-SA 4.0, via Wikimedia Commons.
// The license requires the credit shown in the caption below.
const PHOTO = {
  src: "/images/iut-lake-auditorium.jpg",
  page: "https://commons.wikimedia.org/wiki/File:IUT_Lake_Auditorium.jpg",
  author: "Classique53",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

/** The photo side of the sign-in pages: the campus, the name and a line about it. */
export function AuthScene({ lead, line, notice }: { lead: string; line?: string; notice?: string }) {
  return (
    <section className={styles.scene} aria-label={`${brand.name}, Islamic University of Technology`}>
      <div className={styles.photo} aria-hidden="true">
        <Image src={PHOTO.src} alt="" fill priority sizes="(max-width: 860px) 100vw, 64vw" />
      </div>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">I</span>
        {brand.name}
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Islamic University of Technology · Gazipur</p>
        <h1>{brand.loginTitle}</h1>
        <p className={styles.lead}>{lead}</p>
        {line && <p className={styles.line}>{line}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}
      </div>
    </section>
  );
}
