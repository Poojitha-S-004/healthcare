import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TeleconsultSession } from "../../database/entities/teleconsult-session.entity";

@Entity("teleconsult_messages")
@Index("teleconsultMessages_session_created", ["sessionId", "createdAt"])
export class TeleconsultMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  sessionId: number;

  @Column({ type: "int" })
  senderUserId: number;

  @Column({ type: "varchar", length: 32 })
  senderRole: string;

  @Column({ type: "varchar", length: 255 })
  senderName: string;

  @Column({ type: "text" })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TeleconsultSession, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sessionId" })
  session: TeleconsultSession;
}
