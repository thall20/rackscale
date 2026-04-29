import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import scenariosRouter from "./scenarios";
import dashboardRouter from "./dashboard";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(scenariosRouter);
router.use(dashboardRouter);
router.use(profileRouter);

export default router;
